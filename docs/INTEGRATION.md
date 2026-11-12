# Teammate contracts

Contracts are defined in `backend/schemas.py`. Add wrappers outside teammate-owned `backend/security/`, `simulator/`, and `frontend/`, then configure their import paths. `backend/adapters.py` validates output. All wrapper functions must be asynchronous, bounded and cancellation-safe. No missing module falls back to invented evidence.

## Member 1: scanner

Set `SCANNER_MODULE=integrations.scanner` (example path). Provide:

```python
async def scan(repository_path: str) -> dict: ...
```

The path is an existing resolved directory inside the configured root. Return Evidence: `nodes` (`id`, `kind`: service/dependency, `label`), `edges` (`source`, `target`), `findings` (`id`, `dependency_id`, `severity`, `description`, `remediation`), `source` (SBOM/tool/version provenance), and `fixture` (false for real evidence). Severity is info/low/medium/high/critical. IDs must be unique, and references must exist. Use stable version-specific dependency IDs, preferably package URLs. Normalize actual CycloneDX/SPDX and topology into consumer-to-dependency edges in the wrapper; the API does not infer links from package names. Return empty lists only if actually observed. Raise on scanner failures. Do not execute repository instructions/scripts. Use bounded async subprocesses and safe argument lists rather than blocking the event loop.

## Member 2: simulator

Set `SIMULATOR_MODULE=integrations.simulator` (example path). Provide:

```python
async def banks_status() -> dict: ...
async def start(simulation_id: str, scan_id: str, targets: list[str]) -> dict: ...
async def status(simulation_id: str) -> dict: ...
async def inject_failure(request: dict) -> dict: ...
```

Banks return `{"banks":[{"id":"bank-a","status":"up","observed_at":"<UTC ISO timestamp>"}],"fixture":false}`. Bank states are up/down/degraded/unknown. Simulations return `{"id":"<supplied id>","state":"running","measured_results":{},"fixture":false}`. States are queued/running/completed/failed. Honor the supplied ID; make start/failure cancellation and retries safe. Failure requests contain `simulation_id`, `target`, `mode` (timeout/offline/latency), `duration_seconds` (1–60). Automatically recover after duration. Enforce simulator-side authentication, target validation, resource limits and audit logging. Return measured data with timestamps, units, sample counts and provenance. Keep simulator state persistent independently; API SQLite stores ownership and snapshots and refreshes status from the simulator.

Host simulated banks separately in a private service/network or isolated container group. Do not expose injection ports publicly. Supply an async HTTP wrapper with a fixed configured simulator URL, credentials and timeouts; never accept client-selected URLs. No remote service is assumed or provisioned here. Render API's disk does not host banks. Set `SIMULATOR_TARGETS` to identifiers mapped by the wrapper to isolated banks. Enable `FAILURE_ENABLED` only after authentication, isolation and automatic recovery work. A timeout can mean an action happened; reconcile by simulation ID before retrying. Never use real bank endpoints.

## Member 3: frontend

Generate clients from `/openapi.json`. Supply bearer credentials at runtime. Scan POST returns 202 with `id` and `queued`; poll until completed/failed, then graph/analyze. Handle error envelopes and retain request IDs. Display fixture banners whenever `fixture=true`. Label graph results as predictions and simulator results as measured observations. Render evidence/model text as plain text. Keep checkout separate from simulator controls and simulated transactions. PayPal client ID may be public, but secret/webhook ID stay server-side. Use one create idempotency key per intended checkout, reused after timeouts. Buyer approval precedes capture. Require a validated capture response rather than treating an approval redirect as payment success.

## External checks still required

Connect real scanner/simulator wrappers and verify real SBOM topology and measured recovery. Configure Sandbox credentials, approve/capture an actual Sandbox order, and deliver a real app webhook including redelivery. Validate Render provisioning and disk persistence. These checks have not been claimed as passing automated tests.
