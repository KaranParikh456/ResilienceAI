"""
ResilienceAI - bank simulator resilience test.

Runs real requests against the three bank containers and records what actually
happened (success rates, latency, recovery time). Nothing here is hardcoded or
simulated on the test side. Needs only the Python standard library.

Usage (from the simulator folder, with the banks running):
    python resilience_test.py              # API-level tests only
    python resilience_test.py --docker     # also stops/starts bank-a via docker compose
"""
import argparse
import json
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

BANKS = {"bank_a": 8001, "bank_b": 8002, "bank_c": 8003}
HERE = Path(__file__).resolve().parent
RUN = uuid.uuid4().hex[:6]
_counter = 0


def call(bank, method, path, body=None, timeout=5):
    """Returns (http_status or None, parsed_json or None, elapsed_ms)."""
    url = f"http://127.0.0.1:{BANKS[bank]}{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        url, data=data, method=method, headers={"Content-Type": "application/json"}
    )
    start = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            status, raw = r.status, r.read()
    except urllib.error.HTTPError as e:
        status, raw = e.code, e.read()
    except Exception:  # connection refused, timeout, etc.
        return None, None, (time.perf_counter() - start) * 1000
    elapsed = (time.perf_counter() - start) * 1000
    try:
        return status, json.loads(raw), elapsed
    except ValueError:
        return status, None, elapsed


def send(bank, txn_id=None, amount="100.00", timeout=5):
    global _counter
    if txn_id is None:
        _counter += 1
        txn_id = f"t{RUN}_{_counter}"
    body = {"transaction_id": txn_id, "amount": amount, "currency": "INR"}
    return call(bank, "POST", "/transactions", body, timeout)


def set_failure(bank, mode="none", latency_ms=0, error_rate=0.0):
    call(bank, "POST", "/simulation/failure",
         {"mode": mode, "latency_ms": latency_ms, "error_rate": error_rate})


def reset_all():
    for b in BANKS:
        call(b, "POST", "/simulation/reset")


def summarize(results):
    n = len(results)
    ok = sum(1 for s, b, _ in results if s == 200 and b and b.get("status") == "success")
    no_resp = sum(1 for s, _, _ in results if s is None)
    times = sorted(t for _, _, t in results)
    return {
        "requests": n,
        "success": ok,
        "failed_with_response": n - ok - no_resp,
        "no_response": no_resp,
        "success_rate": round(ok / n, 3) if n else None,
        "avg_ms": round(sum(times) / n, 1) if n else None,
        "p95_ms": round(times[int(0.95 * (n - 1))], 1) if n else None,
    }


# ---------------------------------------------------------------- scenarios
def baseline():
    reset_all()
    res = {b: summarize([send(b) for _ in range(30)]) for b in BANKS}
    ok = all(r["success_rate"] == 1.0 for r in res.values())
    return {"results": res, "pass": ok, "expect": "100% success on all banks"}


def idempotency():
    reset_all()
    first = send("bank_a", "idem_1", "1000.00")
    replay = send("bank_a", "idem_1", "1000.00")
    conflict = send("bank_a", "idem_1", "500.00")
    with ThreadPoolExecutor(20) as ex:
        conc = list(ex.map(lambda _: send("bank_a", "idem_conc", "75.00"), range(20)))
    times = {b["processing_time_ms"] for s, b, _ in conc if s == 200}
    checks = {
        "replay_returns_stored_result": replay[0] == 200
        and replay[1]["processing_time_ms"] == first[1]["processing_time_ms"],
        "conflict_returns_409": conflict[0] == 409,
        "concurrent_duplicates_processed_once": all(s == 200 for s, _, _ in conc)
        and len(times) == 1,
    }
    return {"results": checks, "pass": all(checks.values()),
            "expect": "replay = stored result, different payload = 409, 20 parallel duplicates = 1 result"}


def latency():
    reset_all()
    set_failure("bank_a", "latency", latency_ms=1000)
    a = summarize([send("bank_a", timeout=10) for _ in range(10)])
    b = summarize([send("bank_b") for _ in range(10)])
    health = call("bank_a", "GET", "/health")[1]
    ok = a["avg_ms"] >= 1000 and b["avg_ms"] < 500 and health["status"] == "degraded"
    reset_all()
    return {"results": {"bank_a": a, "bank_b": b, "bank_a_health": health["status"]},
            "pass": ok, "expect": "bank_a avg >= 1000 ms and degraded, bank_b unaffected"}


def random_errors(rate=0.5, n=200):
    reset_all()
    set_failure("bank_a", "error", error_rate=rate)
    a = summarize([send("bank_a") for _ in range(n)])
    observed = 1 - a["success_rate"]
    ok = abs(observed - rate) <= 0.10
    reset_all()
    return {"results": {"configured_error_rate": rate, "observed_error_rate": round(observed, 3), "bank_a": a},
            "pass": ok, "expect": f"observed error rate within 0.10 of {rate} over {n} requests"}


def down_isolation():
    reset_all()
    set_failure("bank_a", "down")
    res = {b: summarize([send(b) for _ in range(20)]) for b in BANKS}
    health = call("bank_a", "GET", "/health")
    ok = (res["bank_a"]["success_rate"] == 0.0 and res["bank_b"]["success_rate"] == 1.0
          and res["bank_c"]["success_rate"] == 1.0 and health[0] == 503)
    return {"results": res, "pass": ok, "expect": "bank_a 0% success + /health 503, bank_b and bank_c 100%"}


def reset_recovery():
    reset_all()
    set_failure("bank_a", "down")
    t0 = time.perf_counter()
    call("bank_a", "POST", "/simulation/reset")
    while time.perf_counter() - t0 < 10:
        s, b, _ = send("bank_a")
        if s == 200:
            ms = round((time.perf_counter() - t0) * 1000, 1)
            return {"results": {"recovery_ms": ms}, "pass": True, "expect": "bank_a processes again after reset"}
    return {"results": {"recovery_ms": None}, "pass": False, "expect": "bank_a processes again after reset"}


def container_recovery():
    def compose(action):
        return subprocess.run(["docker", "compose", action, "bank-a"], cwd=HERE,
                              capture_output=True, text=True)

    reset_all()
    if compose("stop").returncode != 0:
        return {"results": "could not run 'docker compose stop bank-a'", "pass": False, "expect": ""}
    time.sleep(1)
    during_a = summarize([send("bank_a", timeout=2) for _ in range(5)])
    during_b = summarize([send("bank_b") for _ in range(10)])
    during_c = summarize([send("bank_c") for _ in range(10)])
    t0 = time.perf_counter()
    compose("start")
    recovery_s = None
    while time.perf_counter() - t0 < 60:
        s, b, _ = call("bank_a", "GET", "/health", timeout=1)
        if s == 200 and b and b.get("status") == "healthy":
            recovery_s = round(time.perf_counter() - t0, 2)
            break
        time.sleep(0.2)
    after = summarize([send("bank_a") for _ in range(10)]) if recovery_s else None
    ok = (during_a["no_response"] == 5 and during_b["success_rate"] == 1.0
          and during_c["success_rate"] == 1.0 and recovery_s is not None
          and after and after["success_rate"] == 1.0)
    return {"results": {"during_outage_bank_a": during_a, "during_outage_bank_b": during_b,
                        "during_outage_bank_c": during_c, "restart_to_healthy_s": recovery_s,
                        "after_recovery_bank_a": after},
            "pass": bool(ok), "expect": "bank_a unreachable, b/c unaffected, bank_a healthy again after start"}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--docker", action="store_true", help="also test stopping/starting the bank-a container")
    args = ap.parse_args()

    for b in BANKS:
        if call(b, "GET", "/health", timeout=2)[0] is None:
            sys.exit(f"{b} is not reachable on port {BANKS[b]}. Run 'docker compose up' first.")

    scenarios = [("baseline", baseline), ("idempotency", idempotency), ("latency_injection", latency),
                 ("random_errors", random_errors), ("down_isolation", down_isolation),
                 ("reset_recovery", reset_recovery)]
    if args.docker:
        scenarios.append(("container_stop_start", container_recovery))

    report = {"run_at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "scenarios": {}}
    try:
        for name, fn in scenarios:
            print(f"Running {name} ...", flush=True)
            report["scenarios"][name] = fn()
    finally:
        reset_all()

    out_dir = HERE / "results"
    out_dir.mkdir(exist_ok=True)
    out = out_dir / f"resilience_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    out.write_text(json.dumps(report, indent=2))

    print("\n=== SUMMARY ===")
    for name, r in report["scenarios"].items():
        print(f"{'PASS' if r['pass'] else 'FAIL':5} {name:22} expected: {r['expect']}")
    print(f"\nFull measured results saved to: {out}")
    sys.exit(0 if all(r["pass"] for r in report["scenarios"].values()) else 1)


if __name__ == "__main__":
    main()
