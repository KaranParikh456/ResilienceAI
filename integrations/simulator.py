"""Fixed loopback bank HTTP adapter with independent durable observations."""
import asyncio
import json
import os
import sqlite3
import time
from datetime import datetime, timezone
from uuid import uuid4
import httpx
URLS = {f'bank-{c}':f'http://127.0.0.1:{8001+i}' for i,c in enumerate('abc')}
def now(): return datetime.now(timezone.utc).isoformat()
def db():
    c=sqlite3.connect(os.getenv('SIMULATOR_DATABASE','work/simulator.db'))
    c.execute('CREATE TABLE IF NOT EXISTS simulations (id TEXT PRIMARY KEY, data TEXT NOT NULL)')
    return c
def get(id):
    with db() as c: row=c.execute('SELECT data FROM simulations WHERE id=?',(id,)).fetchone()
    if not row: raise ValueError('unknown_simulation')
    return json.loads(row[0])
def put(data):
    with db() as c: c.execute('INSERT OR REPLACE INTO simulations VALUES (?,?)',(data['id'],json.dumps(data)))
def client():
    token=os.environ.get('SIMULATOR_TOKEN','')
    if len(token)<32: raise RuntimeError('Simulator credentials missing')
    return httpx.AsyncClient(headers={'Authorization':'Bearer '+token},timeout=2,trust_env=False)
async def observe(bank):
    start=time.perf_counter()
    async with client() as c:
        try:
            r=await c.get(URLS[bank]+'/health')
            if r.status_code not in (200,503): r.raise_for_status()
            data=r.json()
            if data['bank_id'] != bank.replace('-','_'): raise ValueError('bank identity mismatch')
            status={'healthy':'up','degraded':'degraded','down':'down'}[data['status']]
        except httpx.TransportError: status='unknown'
    return dict(id=bank,status=status,observed_at=now(),latency_ms=round((time.perf_counter()-start)*1000,2))
async def banks_status():
    observations=await asyncio.gather(*(observe(b) for b in URLS))
    return dict(banks=[{k:v for k,v in b.items() if k!='latency_ms'} for b in observations],fixture=False)
async def sample(record):
    observations=await asyncio.gather(*(observe(b) for b in record['targets']))
    transactions=[]
    async with client() as c:
        for bank in record['targets']:
            payload=dict(transaction_id=str(uuid4()),amount='1.00',currency='USD')
            begin=time.perf_counter()
            try:
                r=await c.post(URLS[bank]+'/transactions',json=payload)
                if r.status_code not in (200,503): r.raise_for_status()
                data=r.json()
                success=r.status_code==200 and data.get('status')=='success'
            except httpx.TransportError: success=False
            transactions.append(dict(id=payload['transaction_id'],bank=bank,amount=1,status='SUCCESS' if success else 'FAILED',time=now(),latency_ms=round((time.perf_counter()-begin)*1000,2)))
    results=record['measured_results']
    results['observations']=(results.get('observations',[])+observations)[-300:]
    results['transactions']=(results.get('transactions',[])+transactions)[-300:]
    results.update(sample_count=len(results['transactions']),units={'latency':'ms','amount':'USD'},provenance='Authenticated HTTP health and synthetic transactions to isolated localhost banks',observed_at=now())
    if record.get('recover_at') and time.time()>=record['recover_at']:
        record['state']='completed' if all(b['status']=='up' for b in observations) else 'running'
    put(record)
    return public(record)
def public(record): return {k:record[k] for k in ('id','state','measured_results','fixture')}
async def start(simulation_id, scan_id, targets):
    if not targets or not set(targets)<=URLS.keys(): raise ValueError('invalid_targets')
    try:
        record=get(simulation_id)
        if record['scan_id']!=scan_id or record['targets']!=targets: raise ValueError('idempotency_conflict')
        return public(record)
    except ValueError as exc:
        if str(exc)!='unknown_simulation': raise
    record=dict(id=simulation_id,scan_id=scan_id,targets=targets,state='running',measured_results={},fixture=False)
    put(record)
    return await sample(record)
async def status(simulation_id): return await sample(get(simulation_id))
async def inject_failure(request):
    record=get(request['simulation_id'])
    if request['target'] not in record['targets']: raise ValueError('invalid_target')
    # Bank durably deduplicates an active request and owns the recovery deadline.
    async with client() as c:
        r=await c.post(URLS[request['target']]+'/control/failure',json=request)
        r.raise_for_status()
    record['recover_at']=r.json()['until']
    record['state']='running'
    put(record)
    return await sample(record)
