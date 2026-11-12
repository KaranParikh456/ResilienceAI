# Local integration

No GitHub push is needed. Teammate security and simulator source files are unchanged.

## Start

From the repository root, run `.venv\Scripts\python -m integrations.local`.
Existing listeners on 8000, 8001–8003 or 3000 are preserved: stop their original launcher before starting the protected stack. Do not enable injection against the original unauthenticated bank entrypoints. The integration launcher serves `integrations.bank:app`, bound only to 127.0.0.1, using bank_a/bank_b/bank_c on 8001/8002/8003. The API uses a fixed mapping to those ports; clients cannot choose URLs.

The launcher adds missing `.env` keys without replacing existing values. Check that existing settings select `integrations.scanner`, `integrations.simulator`, the three allowlisted bank IDs, and the localhost:3000 CORS origin. Conflicting existing values require manual reconciliation. API and simulator tokens are distinct. `.env` stays ignored by Git.

Run `.venv\Scripts\python -m integrations.local --show-token` in your own terminal; open Connection settings in the sidebar and paste that API token into the Connect input. The token stays in sessionStorage, never a public build variable. Disconnect clears the browser session. `frontend/.env.local` should contain only `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000` (the default is already correct).

Open http://127.0.0.1:3000. On Security enter `ResilienceAI-integration`, relative to REPOSITORY_ROOT (normally C:/Projects). Scans return a queued job and poll until terminal state. Graph and AI views reuse the completed scan ID. They describe predictions; simulator transactions and health are measured observations. Fixture evidence always has a banner. A new scan clears the previous simulation selection.

## Required external tools

Trivy and OSV-Scanner must be installed and on PATH, with access to their vulnerability databases. The local setup was verified with Trivy 0.76.2 and OSV-Scanner 2.7.0 after installation; a fresh checkout still requires these external binaries. The scanner runs bounded, cancellation-safe subprocesses, limits output, reads CycloneDX dependency references, and refuses tool failures or ambiguous package identity. It never executes repository scripts. A browser workflow produced scanner findings locally. Re-run scanning in your own environment; the isolated tests below use explicitly synthetic scan evidence.

No PayPal Sandbox client ID, secret or webhook ID was configured. Checkout/capture/webhook verification remains blocked. No AI endpoint, key or model was configured; the backend returns its labelled deterministic fallback. Docker is installed, but this local launcher does not require Docker or claim Docker engine verification.

## Simulation behavior

All bank endpoints require a separate simulator bearer token. Original permanent failure/reset endpoints are blocked by the wrapper. Timed controls accept only offline/timeout/latency and 1–60 seconds. Deadline and request identity are persisted per bank under work/; each health/transaction request reconciles the deadline before using bank state, including after restart. Retrying the same failure after recovery does not inject again. A conflicting active failure returns 409. Offline maps to down, latency to 500 ms, and timeout to 5 seconds with a 2-second observation timeout.

Simulation records persist separately in work/simulator.db. Start/status/failure collect real health and $1 synthetic bank transactions, labelled with UTC times, latency units, counts and provenance. These are isolated simulated transactions and never payments. Results retain at most 300 transaction and health samples. A recovered simulation completes after all selected banks are observed up. The supplied banks have no failover engine: the frontend disables that control. Clear observations changes the selected simulation; it does not cancel a bank's recovery deadline.

## Validation

Run `.venv\Scripts\python -m pytest -q`, `.venv\Scripts\python -m pip check`, `node tests/frontend_workflow.cjs`, and `frontend\node_modules\.bin\tsc --noEmit -p frontend/tsconfig.json`.

The existing 13 tests plus 3 adapter tests passed. Adapter tests launch protected banks on isolated ports 18001–18003, use explicitly synthetic scanner evidence for the API scan/graph/analysis workflow, and verify actual transaction failures, automatic recovery, persistence and retry behavior. They do not replace real scanner validation. The frontend test exercises the real client code against explicit HTTP test responses for runtime auth, scan polling, graph, analysis and request-ID errors.

Frontend TypeScript passed. Webpack compilation also succeeded; full Next.js production output was blocked by Windows sandbox EPERM errors creating prerender directories. Turbopack also failed to connect to a spawned CSS worker in this sandbox. A complete browser-based workflow and successful production build remain unverified. System font fallbacks avoid external Google Fonts requests during local builds.

Regenerate TypeScript contracts with `.venv\Scripts\python -m integrations.generate_contracts` after changing backend schemas.
