import hashlib
import json
import time
from decimal import Decimal
from uuid import NAMESPACE_URL, uuid5
import httpx
from .schemas import Payment


class PaymentError(Exception):
    def __init__(self, code, status=502):
        self.code, self.status = code, status


class PayPal:
    BASE = 'https://api-m.sandbox.paypal.com'

    def __init__(self, settings, store):
        self.settings, self.store = settings, store

    @property
    def available(self):
        return bool(self.settings.paypal_client_id and self.settings.paypal_client_secret)

    async def request(self, method, path, payload=None, request_id=None):
        if not self.available:
            raise PaymentError('paypal_unavailable', 503)
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                token = await client.post(self.BASE + '/v1/oauth2/token',
                    auth=(self.settings.paypal_client_id, self.settings.paypal_client_secret),
                    data={'grant_type': 'client_credentials'})
                token.raise_for_status()
                headers = {'Authorization': 'Bearer ' + token.json()['access_token'],
                           'Content-Type': 'application/json', 'Prefer': 'return=representation'}
                if request_id:
                    headers['PayPal-Request-Id'] = request_id
                response = await client.request(method, self.BASE + path, headers=headers, json=payload)
                response.raise_for_status()
                return response.json()
        except (httpx.HTTPError, ValueError, KeyError) as exc:
            raise PaymentError('paypal_request_failed') from exc

    async def operation(self, owner, key, action, payload, work):
        op = str(uuid5(NAMESPACE_URL, owner + ':' + action + ':' + key))
        fingerprint = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
        with self.store.connect() as db:
            db.execute('INSERT OR IGNORE INTO operations VALUES (?,?,?,?,NULL)',
                       (op, owner, fingerprint, time.time()))
            row = db.execute('SELECT * FROM operations WHERE id=?', (op,)).fetchone()
        if row['fingerprint'] != fingerprint:
            raise PaymentError('idempotency_conflict', 409)
        if row['result']:
            return Payment.model_validate_json(row['result'])
        # PayPal stores request IDs for six hours by default. Never risk a duplicate
        # after an ambiguous request outlives that retention period.
        if time.time() - row['created'] > 5 * 3600:
            raise PaymentError('payment_requires_reconciliation', 409)
        result = await work(op)
        with self.store.connect() as db:
            db.execute('UPDATE operations SET result=? WHERE id=?', (result.model_dump_json(), op))
        return result

    def validate_units(self, data, expected, captured=False):
        try:
            units = data['purchase_units']
            if len(units) != 1:
                raise ValueError('purchase_unit_count')
            unit = units[0]
            if (unit['custom_id'] != expected['reference'] or
                unit['amount']['currency_code'] != 'USD' or
                Decimal(unit['amount']['value']) != Decimal(expected['amount'])):
                raise ValueError('order_evidence')
            if captured:
                captures = unit['payments']['captures']
                if data['status'] != 'COMPLETED' or len(captures) != 1:
                    raise ValueError('capture_count_or_status')
                capture = captures[0]
                if (capture['status'] != 'COMPLETED' or capture['amount']['currency_code'] != 'USD' or
                    Decimal(capture['amount']['value']) != Decimal(expected['amount']) or not capture['id']):
                    raise ValueError('capture_evidence')
                return capture['id']
        except (KeyError, TypeError, ValueError, ArithmeticError) as exc:
            raise PaymentError('payment_evidence_mismatch', 409) from exc

    async def create(self, owner, key, body):
        async def work(op):
            expected = {'reference': op, 'amount': self.settings.payment_amount}
            data = await self.request('POST', '/v2/checkout/orders', {
                'intent': 'CAPTURE', 'purchase_units': [{'custom_id': op,
                'amount': {'currency_code': 'USD', 'value': expected['amount']}}]}, op)
            self.validate_units(data, expected)
            if not data.get('id') or data.get('status') not in ('CREATED', 'PAYER_ACTION_REQUIRED', 'APPROVED'):
                raise PaymentError('invalid_order_response')
            approval = next((l['href'] for l in data.get('links', []) if l.get('rel') in ('approve', 'payer-action')), None)
            result = Payment(order_id=data['id'], status=data['status'], amount=expected['amount'], approval_url=approval)
            self.store.put('payment', data['id'], owner, {**expected, **result.model_dump(), 'owner': owner})
            return result
        return await self.operation(owner, key, 'create', {**body.model_dump(), 'amount': self.settings.payment_amount, 'currency': 'USD'}, work)

    async def capture(self, owner, order_id):
        expected = self.store.get('payment', order_id, owner)
        if not expected:
            raise PaymentError('order_not_found', 404)
        async def work(op):
            current = await self.request('GET', '/v2/checkout/orders/' + order_id)
            if current.get('id') != order_id:
                raise PaymentError('order_id_mismatch', 409)
            self.validate_units(current, expected)
            if current['status'] == 'COMPLETED':
                data = current
            else:
                if current['status'] != 'APPROVED':
                    raise PaymentError('buyer_approval_required', 409)
                data = await self.request('POST', '/v2/checkout/orders/' + order_id + '/capture', {}, op)
            if data.get('id') != order_id:
                raise PaymentError('order_id_mismatch', 409)
            capture_id = self.validate_units(data, expected, captured=True)
            result = Payment(order_id=order_id, status='COMPLETED', amount=expected['amount'], capture_id=capture_id)
            self.store.put('payment', order_id, owner, {**expected, **result.model_dump()})
            return result
        return await self.operation(owner, order_id, 'capture', {'order_id': order_id}, work)

    async def webhook(self, headers, event):
        if not self.settings.paypal_webhook_id:
            raise PaymentError('webhook_unavailable', 503)
        fields = {'auth_algo': 'paypal-auth-algo', 'cert_url': 'paypal-cert-url',
                  'transmission_id': 'paypal-transmission-id', 'transmission_sig': 'paypal-transmission-sig',
                  'transmission_time': 'paypal-transmission-time'}
        if any(not headers.get(v) for v in fields.values()) or not isinstance(event.get('id'), str):
            raise PaymentError('invalid_webhook', 400)
        verification = await self.request('POST', '/v1/notifications/verify-webhook-signature',
            {**{k: headers[v] for k, v in fields.items()}, 'webhook_id': self.settings.paypal_webhook_id,
             'webhook_event': event})
        if verification.get('verification_status') != 'SUCCESS':
            raise PaymentError('invalid_webhook_signature', 401)
        with self.store.connect() as db:
            if db.execute('SELECT 1 FROM events WHERE id=?', (event['id'],)).fetchone():
                return True
        if event.get('event_type') == 'PAYMENT.CAPTURE.COMPLETED':
            try:
                resource = event['resource']
                order_id = resource['supplementary_data']['related_ids']['order_id']
                expected = self.store.get('payment', order_id)
                if expected:
                    if resource['status'] != 'COMPLETED' or resource['amount']['currency_code'] != 'USD' or Decimal(resource['amount']['value']) != Decimal(expected['amount']):
                        raise PaymentError('payment_evidence_mismatch', 409)
                    # Reconcile against authenticated order details; webhook alone cannot fulfill.
                    result = await self.capture(expected['owner'], order_id)
                    if result.capture_id != resource['id']:
                        raise PaymentError('capture_mismatch', 409)
            except (KeyError, TypeError, ValueError, ArithmeticError) as exc:
                raise PaymentError('invalid_webhook', 400) from exc
        with self.store.connect() as db:
            db.execute('INSERT OR IGNORE INTO events VALUES (?)', (event['id'],))
        return False
