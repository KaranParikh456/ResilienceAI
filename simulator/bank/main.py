import asyncio
import os
import random
import time
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from models import FailureConfig, TransactionRequest
from state import BankState

BANK_ID = os.getenv("BANK_ID", "bank_a")
if BANK_ID not in {"bank_a", "bank_b", "bank_c"}:
    raise RuntimeError("BANK_ID must be bank_a, bank_b or bank_c")

app = FastAPI(title=f"ResilienceAI {BANK_ID}")
state = BankState()


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def ms_since(start: float) -> int:
    return int((time.perf_counter() - start) * 1000)


def failed(req: TransactionRequest, start: float, status_code: int, code: str, message: str):
    body = {
        "bank_id": BANK_ID,
        "transaction_id": req.transaction_id,
        "status": "failed",
        "amount": req.amount,
        "currency": req.currency,
        "processing_time_ms": ms_since(start),
        "error": {"code": code, "message": message},
    }
    return JSONResponse(status_code=status_code, content=body)


@app.get("/health")
async def health():
    mode = state.failure.mode
    status = {"none": "healthy", "latency": "degraded", "error": "degraded", "down": "down"}[mode]
    body = {
        "bank_id": BANK_ID,
        "status": status,
        "failure_mode": mode,
        "timestamp": now_iso(),
    }
    return JSONResponse(status_code=503 if status == "down" else 200, content=body)


@app.post("/transactions")
async def create_transaction(req: TransactionRequest):
    start = time.perf_counter()
    cfg = state.failure

    if cfg.mode == "down":
        return failed(req, start, 503, "BANK_UNAVAILABLE", "Bank is unavailable")

    if cfg.mode == "latency":
        await asyncio.sleep(cfg.latency_ms / 1000)

    if cfg.mode == "error" and random.random() < cfg.error_rate:
        return failed(req, start, 503, "RANDOM_ERROR", "Simulated random bank error")

    # One lock per transaction_id: concurrent duplicates are processed once.
    async with state.lock_for(req.transaction_id):
        existing = state.get(req.transaction_id)
        if existing is not None:
            if existing.fingerprint != req.fingerprint():
                return failed(
                    req, start, 409, "IDEMPOTENCY_CONFLICT",
                    "transaction_id was already used with a different payload",
                )
            return JSONResponse(status_code=200, content=existing.response)

        await asyncio.sleep(random.uniform(0.02, 0.12))  # simulated base processing time
        response = {
            "bank_id": BANK_ID,
            "transaction_id": req.transaction_id,
            "status": "success",
            "amount": req.amount,
            "currency": req.currency,
            "processing_time_ms": ms_since(start),
            "error": None,
        }
        state.save(req, response)
        return JSONResponse(status_code=200, content=response)


@app.post("/simulation/failure")
async def set_failure(cfg: FailureConfig):
    state.failure = cfg
    return {"bank_id": BANK_ID, "failure": cfg.model_dump()}


@app.post("/simulation/reset")
async def reset():
    state.reset()
    return {"bank_id": BANK_ID, "status": "reset", "failure_mode": "none"}
