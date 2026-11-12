import asyncio
import hmac
import logging
from contextlib import asynccontextmanager
from uuid import uuid4
from fastapi import BackgroundTasks, Depends, FastAPI, Header, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException
from .config import Settings
from .schemas import (Analysis, AnalysisRequest, Banks, Capture, CreateOrder, ErrorResponse,
    Evidence, Failure, Graph, Health, Job, Payment, ScanRequest, Simulation, SimulationStart, WebhookResult)
from .store import Store
from .adapters import Adapter, Unavailable
from .graph import build_graph
from .ai import analyze
from .paypal import PayPal, PaymentError

log = logging.getLogger(__name__)


def create_app(settings=None, scanner=None, simulator=None, paypal=None):
    settings = settings or Settings()
    scanner = scanner or Adapter(settings.scanner_module)
    simulator = simulator or Adapter(settings.simulator_module)

    @asynccontextmanager
    async def lifespan(app):
        app.state.store = Store(settings.database_path)
        app.state.paypal = paypal or PayPal(settings, app.state.store)
        yield

    app = FastAPI(title='ResilienceAI integration API', version='1.0.0', lifespan=lifespan,
                  responses={400: {'model': ErrorResponse}, 401: {'model': ErrorResponse},
                    404: {'model': ErrorResponse}, 409: {'model': ErrorResponse},
                    422: {'model': ErrorResponse}, 502: {'model': ErrorResponse}, 503: {'model': ErrorResponse}})
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins,
        allow_methods=['GET', 'POST'], allow_headers=['Authorization', 'Content-Type', 'Idempotency-Key'])

    def error(request, status, code, message=None):
        return JSONResponse(status_code=status, content={'error': {'code': code,
            'message': message or code.replace('_', ' '), 'request_id': getattr(request.state, 'request_id', str(uuid4()))}})

    @app.middleware('http')
    async def boundary(request, call_next):
        request.state.request_id = str(uuid4())
        try:
            # Bound request bodies even when Content-Length is absent or dishonest.
            body = bytearray()
            async for chunk in request.stream():
                body.extend(chunk)
                if len(body) > 1_048_576:
                    return error(request, 413, 'request_too_large')
            request._body = bytes(body)
            response = await call_next(request)
        except Exception:
            log.exception('Unhandled request failure %s', request.state.request_id)
            response = error(request, 500, 'internal_error')
        response.headers['X-Request-ID'] = request.state.request_id
        return response

    @app.exception_handler(HTTPException)
    async def http_error(request, exc):
        return error(request, exc.status_code, str(exc.detail))

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, exc):
        return error(request, 422, 'validation_error', 'Request does not match the API schema; see /docs.')

    @app.exception_handler(PaymentError)
    async def payment_error(request, exc):
        return error(request, exc.status, exc.code)

    @app.exception_handler(Unavailable)
    async def unavailable(request, exc):
        return error(request, 503, 'integration_unavailable')

    def owner(authorization: str = Header(default='')):
        supplied = authorization.removeprefix('Bearer ') if authorization.startswith('Bearer ') else ''
        for token, user in settings.api_tokens.items():
            if hmac.compare_digest(token, supplied):
                return user
        raise HTTPException(401, 'authentication_required')

    def stored(kind, id, user):
        data = app.state.store.get(kind, id, user)
        if data is None:
            raise HTTPException(404, kind + '_not_found')
        return data

    def completed(id, user):
        job = Job.model_validate(stored('scan', id, user))
        if job.state != 'completed':
            raise HTTPException(409, 'scan_not_completed')
        return job.evidence

    async def adapter_call(awaitable):
        try:
            result = await asyncio.wait_for(awaitable, timeout=30)
            if result.fixture and not settings.allow_fixtures:
                raise HTTPException(503, 'fixture_data_disabled')
            return result
        except HTTPException:
            raise
        except Unavailable:
            raise
        except Exception as exc:
            log.warning('Simulator adapter failed: %s', type(exc).__name__)
            raise HTTPException(502, 'simulator_adapter_failed') from exc

    @app.get('/health', response_model=Health)
    async def health():
        return Health(status='ok')

    @app.get('/ready', response_model=Health)
    async def ready():
        with app.state.store.connect() as db:
            db.execute('SELECT 1').fetchone()
        return Health(status='ready', capabilities={
            'scanner': scanner.available('scan'),
            'simulator': simulator.available('banks_status', 'start', 'status', 'inject_failure'),
            'paypal': app.state.paypal.available, 'ai': bool(settings.ai_url),
            'authenticated_api': bool(settings.api_tokens)})

    async def run_scan(id, user, path):
        store = app.state.store
        job = Job(id=id, state='running')
        store.put('scan', id, user, job.model_dump())
        try:
            evidence = await asyncio.wait_for(scanner.scan(path), timeout=300)
            evidence = Evidence.model_validate(evidence)
            if evidence.fixture and not settings.allow_fixtures:
                raise ValueError('fixture_evidence_disabled')
            job = Job(id=id, state='completed', evidence=evidence)
        except Exception:
            log.exception('Scan failed %s', id)
            job = Job(id=id, state='failed', error='scanner_failed_or_invalid_evidence')
        store.put('scan', id, user, job.model_dump())

    @app.post('/api/scan', response_model=Job, status_code=202)
    async def scan(body: ScanRequest, tasks: BackgroundTasks, user=Depends(owner)):
        if not scanner.available('scan'):
            raise Unavailable()
        root = settings.repository_root.resolve()
        path = (root / body.repository).resolve()
        if not path.is_relative_to(root) or path == root or not path.is_dir():
            raise HTTPException(422, 'invalid_repository_path')
        id = str(uuid4())
        job = Job(id=id, state='queued')
        app.state.store.put('scan', id, user, job.model_dump())
        tasks.add_task(run_scan, id, user, path)
        return job

    @app.get('/api/scan/{scan_id}', response_model=Job)
    async def get_scan(scan_id: str, user=Depends(owner)):
        return stored('scan', scan_id, user)

    @app.get('/api/graph/{scan_id}', response_model=Graph)
    async def graph(scan_id: str, user=Depends(owner)):
        return build_graph(scan_id, completed(scan_id, user))

    @app.get('/api/banks/status', response_model=Banks)
    async def banks(user=Depends(owner)):
        return await adapter_call(simulator.banks())

    @app.post('/api/simulation/start', response_model=Simulation, status_code=202)
    async def start(body: SimulationStart, user=Depends(owner)):
        completed(body.scan_id, user)
        if not set(body.targets) <= set(settings.simulator_targets):
            raise HTTPException(403, 'simulator_target_not_allowed')
        id = str(uuid4())
        result = await adapter_call(simulator.start(id, body.scan_id, body.targets))
        if result.id != id:
            raise HTTPException(502, 'simulator_id_mismatch')
        app.state.store.put('simulation', id, user, {'targets': body.targets, 'result': result.model_dump()})
        return result

    @app.post('/api/simulation/failure', response_model=Simulation)
    async def failure(body: Failure, user=Depends(owner)):
        if not settings.failure_enabled:
            raise HTTPException(403, 'failure_injection_disabled')
        record = stored('simulation', body.simulation_id, user)
        if body.target not in settings.simulator_targets or body.target not in record['targets']:
            raise HTTPException(403, 'simulator_target_not_allowed')
        result = await adapter_call(simulator.failure(body))
        if result.id != body.simulation_id:
            raise HTTPException(502, 'simulator_id_mismatch')
        app.state.store.put('simulation', result.id, user, {**record, 'result': result.model_dump()})
        return result

    @app.get('/api/simulation/{id}', response_model=Simulation)
    async def simulation(id: str, user=Depends(owner)):
        record = stored('simulation', id, user)
        result = await adapter_call(simulator.status(id))
        if result.id != id:
            raise HTTPException(502, 'simulator_id_mismatch')
        app.state.store.put('simulation', id, user, {**record, 'result': result.model_dump()})
        return result

    @app.post('/api/ai/analyze', response_model=Analysis)
    async def ai(body: AnalysisRequest, user=Depends(owner)):
        result = await analyze(settings, body.scan_id, completed(body.scan_id, user))
        app.state.store.put('analysis', str(uuid4()), user, {'scan_id': body.scan_id, **result.model_dump()})
        return result

    @app.post('/api/payments/create-order', response_model=Payment)
    async def create_order(body: CreateOrder, user=Depends(owner),
                           idempotency_key: str = Header(min_length=8, max_length=100)):
        return await app.state.paypal.create(user, idempotency_key, body)

    @app.post('/api/payments/capture', response_model=Payment)
    async def capture(body: Capture, user=Depends(owner)):
        return await app.state.paypal.capture(user, body.order_id)

    @app.post('/api/payments/webhook', response_model=WebhookResult)
    async def webhook(request: Request):
        try:
            event = await request.json()
        except (ValueError, UnicodeError):
            raise HTTPException(400, 'invalid_webhook')
        if not isinstance(event, dict):
            raise HTTPException(400, 'invalid_webhook')
        duplicate = await app.state.paypal.webhook(request.headers, event)
        return WebhookResult(duplicate=duplicate)

    return app


app = create_app()
