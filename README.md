# ResilienceAI

### AI-Powered Vulnerability Intelligence and Distributed Infrastructure Resilience

ResilienceAI is a cybersecurity platform that combines open-source software vulnerability detection, infrastructure dependency analysis, distributed-system failure simulation and AI-powered risk recommendations.

## The Problem

Modern applications depend on interconnected open-source packages, services, databases and infrastructure.

A vulnerability or failure in one shared component can affect multiple otherwise independent services.

Traditional security tools often identify vulnerabilities without explaining their wider architectural and operational impact.

## Our Solution

ResilienceAI connects software security with infrastructure resilience.

### Core Modules

1. **OSS Vulnerability Detection** — Detect vulnerabilities using Trivy and OSV-Scanner.
2. **Dependency Analysis** — Map dependencies and identify single points of failure.
3. **Distributed Banking Simulator** — Simulate three independent banks connected through shared infrastructure.
4. **Failure Simulation** — Test server outages, service failures and recovery.
5. **AI Risk Analysis** — Explain findings and recommend security and resilience improvements.
6. **Dashboard** — Visualise vulnerabilities, architecture risks and simulation results.

## Technology Stack

- Python 3.14
- FastAPI
- Next.js
- PostgreSQL
- Docker Compose
- Trivy
- OSV-Scanner
- NetworkX
- Prometheus
- GitHub Actions

## Project Status

**Current milestone:** Initial FastAPI backend successfully running.

Next milestone: Integrate Trivy and OSV-Scanner into the security engine.

## Running the Backend

Activate your virtual environment:

```cmd
.venv\Scripts\activate.bat
```

Install dependencies:

```cmd
python -m pip install fastapi uvicorn sqlalchemy networkx pydantic python-dotenv httpx pytest
```

Run the application:

```cmd
python -m uvicorn backend.main:app --reload
```

Open:

- http://127.0.0.1:8000
- http://127.0.0.1:8000/docs

## Project Motivation

The November 6, 2026 Japan Shinkin Joint System outage motivates our investigation into shared infrastructure dependencies and correlated failures.

ResilienceAI uses a synthetic banking environment to demonstrate these risks. The project does not attribute that incident to an OSS vulnerability or cyberattack.

## Team

A collaborative hackathon project combining cybersecurity, AI and distributed systems.

## Vision

**Secure the software. Identify shared failure points. Simulate disasters. Validate recovery.**
## Integration backend

Backend setup, authentication, PayPal Sandbox, tests, and deployment: [Backend setup](docs/BACKEND_SETUP.md).

Scanner and simulator handoff: [Integration contracts](docs/INTEGRATION.md).
