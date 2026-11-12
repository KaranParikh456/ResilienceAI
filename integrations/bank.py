"""Authenticated loopback entrypoint around the unchanged teammate bank."""
import os
import sys
import time
import json
import hmac
from pathlib import Path
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
load_dotenv()
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'simulator' / 'bank'))
from main import app, state
from models import FailureConfig
key = os.environ.get('SIMULATOR_TOKEN', '')
if len(key) < 32:
    raise RuntimeError('SIMULATOR_TOKEN must contain at least 32 characters')
file = Path('work') / (os.environ['BANK_ID'] + '-failure.json')
file.parent.mkdir(exist_ok=True)
def save(data):
    temp = file.with_suffix('.tmp')
    temp.write_text(json.dumps(data), encoding='utf-8')
    temp.replace(file)
def recover():
    if file.exists():
        data = json.loads(file.read_text())
        state.failure = FailureConfig(**data['config']) if data['until'] > time.time() else FailureConfig()
    else:
        state.failure = FailureConfig()
@app.middleware('http')
async def guard(request, call_next):
    if not hmac.compare_digest(request.headers.get('authorization',''), 'Bearer ' + key):
        return JSONResponse(status_code=401, content={'error':'authentication_required'})
    recover()
    if request.url.path.startswith('/simulation/'):
        # Original permanent injection/reset endpoints are unavailable through this entrypoint.
        return JSONResponse(status_code=404, content={'error':'use_timed_failure'})
    return await call_next(request)
@app.post('/control/failure')
async def failure(request: __import__('fastapi').Request):
    data = await request.json()
    duration = data.get('duration_seconds')
    mode = data.get('mode')
    if type(duration) is not int or not 1 <= duration <= 60 or mode not in ('offline','timeout','latency'):
        return JSONResponse(status_code=422, content={'error':'invalid_failure'})
    existing = json.loads(file.read_text()) if file.exists() else {}
    if existing.get('request') == data:
        return existing
    if existing.get('until',0) > time.time():
        if existing.get('request') != data:
            return JSONResponse(status_code=409, content={'error':'failure_already_active'})
        return existing
    config = {'mode':'down'} if mode == 'offline' else {'mode':'latency','latency_ms':5000 if mode == 'timeout' else 500}
    record = dict(until=time.time()+duration, config=config, request=data)
    save(record)
    recover()
    import logging
    logging.getLogger('uvicorn.error').info('Timed failure bank=%s mode=%s duration=%s',os.environ['BANK_ID'],mode,duration)
    return record
