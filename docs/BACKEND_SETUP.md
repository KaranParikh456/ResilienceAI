# ResilienceAI — Member 4 backend

The workspace was empty when implementation began. No teammate files were modified. FastAPI, SQLite, NetworkX and HTTPX implement the integration boundary. All evidence fixtures are opt-in; no fabricated results are returned by default.

## Setup (PowerShell, Python 3.13)

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.lock.txt
Copy-Item .env.example .env
.\.venv\Scripts\python -c "import secrets; print(secrets.token_urlsafe(32))"
# Edit .env: API_TOKENS={"<generated-token>":"alice"}
.\.venv\Scripts\python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --workers 1
```

Use one worker and one instance. `/docs` has interactive typed contracts; `/openapi.json` is the machine-readable contract. `/health` is liveness. `/ready` checks SQLite and reports optional capabilities; it can succeed with missing integrations. Those routes return 503 instead of invented results. All `/api` routes require bearer authentication except the PayPal-verified webhook. Errors have `error: {code, message, request_id}`. Private records are owner-scoped; missing and other-owner records both return 404.

Configure distinct server-side tokens for users in `API_TOKENS`. This hackathon identity mechanism needs an identity provider, rotation and gateway rate limits before production. Users supply credentials at runtime: never bake server tokens or payment/AI secrets into frontend builds. Explicit `CORS_ORIGINS` controls browser origins, not authorization. Runtime fixture evidence requires `ALLOW_FIXTURES=true`; it is false by default.

## API examples

```powershell
$headers = @{Authorization="Bearer <your-token>"}
Invoke-RestMethod http://localhost:8000/health
Invoke-RestMethod http://localhost:8000/ready
$scan = Invoke-RestMethod http://localhost:8000/api/scan -Method Post -Headers $headers -ContentType application/json -Body '{"repository":"demo"}'
Invoke-RestMethod "http://localhost:8000/api/scan/$($scan.id)" -Headers $headers
Invoke-RestMethod "http://localhost:8000/api/graph/$($scan.id)" -Headers $headers
Invoke-RestMethod http://localhost:8000/api/banks/status -Headers $headers
Invoke-RestMethod http://localhost:8000/api/ai/analyze -Method Post -Headers $headers -ContentType application/json -Body (@{scan_id=$scan.id}|ConvertTo-Json)
$sim = Invoke-RestMethod http://localhost:8000/api/simulation/start -Method Post -Headers $headers -ContentType application/json -Body (@{scan_id=$scan.id;targets=@('bank-a')}|ConvertTo-Json)
Invoke-RestMethod "http://localhost:8000/api/simulation/$($sim.id)" -Headers $headers
# Requires FAILURE_ENABLED=true and allowlisted isolated simulator target:
Invoke-RestMethod http://localhost:8000/api/simulation/failure -Method Post -Headers $headers -ContentType application/json -Body (@{simulation_id=$sim.id;target='bank-a';mode='offline';duration_seconds=5}|ConvertTo-Json)
$paymentHeaders = @{Authorization="Bearer <your-token>"; 'Idempotency-Key'='unique-checkout-key-001'}
$order = Invoke-RestMethod http://localhost:8000/api/payments/create-order -Method Post -Headers $paymentHeaders -ContentType application/json -Body '{"product":"resilience-demo"}'
# Buyer approves at order.approval_url or through PayPal JS SDK first:
Invoke-RestMethod http://localhost:8000/api/payments/capture -Method Post -Headers $headers -ContentType application/json -Body (@{order_id=$order.order_id}|ConvertTo-Json)
```

Provision a trusted checkout under `REPOSITORY_ROOT/demo` and configure the scanner wrapper before scanning. This API does no arbitrary URL fetching, shell execution or cloning. Paths escaping the root are rejected. Scanner wrappers must also avoid executing repository code and enforce resource limits. Local jobs persist queued/running/completed/failed states. Restart marks unfinished jobs failed; retry explicitly. This is a local worker, not a distributed queue. Scan timeout is 300 seconds; simulator timeout is 30 seconds. Wrappers must be asynchronous and cancellation-safe.

## Graph and AI behavior

NetworkX traverses directed `consumer -> dependency` edges from actual scanner evidence, including transitive dependencies and cycles. Shared means at least two services reach the dependency. `predicted_impact` describes potential effects, not observed outages or exploitability. Simulator observations remain in `measured_results`. Empty findings mean only that the scanner supplied none.

AI consumes stored evidence, with repository strings designated as untrusted data and no tools or code execution. Remediation and references come from stored evidence. Without a configured provider, or on provider failure/invalid output, `mode=deterministic_fallback` labels the summary. Optional HTTPS `AI_URL` accepts OpenAI-compatible chat-completion JSON. Configuring it sends repository evidence to that provider; choose appropriately for confidentiality. Model summaries are advisory and can be wrong. Render scanner/model strings as plain text. No live AI provider has been verified.

## PayPal Sandbox

Set Sandbox `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, and the app's `PAYPAL_WEBHOOK_ID` server-side. Base URL is fixed to Sandbox. The only product is `resilience-demo`, priced by `PAYMENT_AMOUNT` in USD; client prices are rejected. Capture validates owner, stored reference, amount, currency, order ID, capture ID and COMPLETED status. Simulation APIs never invoke payment APIs.

Create requires `Idempotency-Key`; capture derives its key from the owned order. SQLite stores fingerprints/results; provider requests use stable UUID `PayPal-Request-Id` values. Ambiguous operations older than five hours require reconciliation rather than retry past the provider's default six-hour retention. Concurrent duplicate requests can return provider errors; retry with the same key. No automatic fulfillment is implemented.

Register `https://<api-host>/api/payments/webhook` in the same Sandbox app for `PAYMENT.CAPTURE.COMPLETED`. The route posts event and transmission headers to PayPal verification and accepts only `SUCCESS`. It reconciles owned captures against order details and deduplicates verified event IDs in SQLite. Unrelated verified events are acknowledged without benefits. Verification fails closed. PayPal's mock webhook simulator does not support postback verification; use actual Sandbox app events for end-to-end testing. Refund/reversal business workflows are outside this demo.

Official documentation checked November 11, 2026: [Orders v2](https://developer.paypal.com/api/orders/v2), [idempotency](https://developer.paypal.com/api/rest/reference/idempotency/), [webhook verification](https://developer.paypal.com/api/rest/webhooks/rest/). Actual Sandbox order/capture/webhook verification needs credentials and buyer approval and has not been performed.

## Tests and Render

```powershell
.\.venv\Scripts\python -m pytest -q
.\.venv\Scripts\python -m pip check
```

Tests explicitly inject labelled synthetic adapters and never perform live scans or payments. `requirements.lock.txt` records the tested environment; `requirements.txt` expresses compatible ranges.

`render.yaml` provisions a paid web service with a persistent SQLite disk. Set `API_TOKENS`, explicit HTTPS frontend `CORS_ORIGINS`, and optional credentials/module paths in Render. Provision checkouts under `/var/data/repositories`. Disk-backed SQLite and background jobs require one instance/worker; back up the disk. Scaling needs shared persistence and a durable queue. Add any Member 1 scanner binaries to the build environment by agreement; none are assumed. Render provisioning has not been performed.

Simulator hosting and handoff requirements: [docs/INTEGRATION.md](INTEGRATION.md).

