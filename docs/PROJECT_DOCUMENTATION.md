# ResilienceAI
## AI-Powered Vulnerability Intelligence and Distributed Infrastructure Resilience

**Project Type:** Cybersecurity + Artificial Intelligence + Distributed Systems  
**Development Stage:** Initial backend successfully running  
**Technology:** Python, FastAPI, Docker, Trivy, OSV-Scanner, Next.js  
**Target:** Hackathon MVP

---

## 1. Project Overview

ResilienceAI is an AI-powered cybersecurity and infrastructure resilience platform designed to help developers identify software vulnerabilities, understand infrastructure dependencies, detect single points of failure, and evaluate how well distributed systems recover from failures.

Traditional vulnerability scanners primarily focus on identifying security weaknesses in software dependencies and configurations.

However, identifying a vulnerable package is only one part of securing a modern distributed application.

Applications often consist of multiple interconnected services, databases, servers, APIs and third-party dependencies. A vulnerability or failure in one shared component can affect several otherwise independent services.

ResilienceAI aims to connect software vulnerability intelligence with infrastructure resilience analysis.

It answers three important questions:

1. Is the software vulnerable?
2. Can the failure or compromise of one component affect multiple services?
3. Can the infrastructure recover safely when a component fails?

The platform combines traditional security scanning, dependency graph analysis, distributed-system simulation and AI-powered risk explanations.

---

## 2. Problem Statement

Modern applications depend heavily on open-source software and distributed infrastructure.

This creates several challenges:

- Open-source dependencies may contain known vulnerabilities.
- The same vulnerable package may be used by multiple services.
- Shared infrastructure can become a single point of failure.
- Developers may not understand the potential impact of a vulnerable component.
- Infrastructure failures can propagate across interconnected services.
- Organizations may not regularly test their disaster recovery and failover mechanisms.

Existing tools often address these problems separately.

ResilienceAI aims to provide a unified platform that connects vulnerability detection, dependency analysis and operational resilience testing.

---

## 3. Real-World Motivation

The November 6, 2026 Japan Shinkin Joint System outage provides an important motivation for this project.

The incident demonstrated how disruption to shared banking infrastructure can affect many otherwise independent financial institutions.

The lesson is that having separate banks or applications does not necessarily mean they have independent infrastructure.

If multiple institutions depend on the same critical component, its failure can create widespread disruption.

ResilienceAI uses a simulated multi-bank environment to demonstrate this problem.

Important distinction: The project does not claim that the Japanese incident was caused by an OSS vulnerability or cyberattack. It uses the incident as motivation for investigating shared dependencies and infrastructure resilience.

---

## 4. Proposed Solution

ResilienceAI consists of five major modules.

### Module 1: OSS Vulnerability Detection

Purpose: Identify known security vulnerabilities in open-source dependencies.

Technologies:
- Trivy
- OSV-Scanner
- Software Bill of Materials (SBOM)

Functions:
- Scan source repositories.
- Identify vulnerable dependencies.
- Detect CVEs and other vulnerability identifiers.
- Identify affected package versions.
- Identify fixed versions when available.
- Generate structured vulnerability reports.

Output: A security report containing vulnerability identifiers, package information, severity and remediation information.

### Module 2: Dependency and Architecture Analysis

Purpose: Understand how software components depend on one another.

Functions:
- Build dependency graphs.
- Identify shared dependencies.
- Identify critical infrastructure components.
- Detect potential single points of failure.
- Identify the services affected by a component failure.
- Analyse architecture configurations.

Technology:
- Python
- NetworkX
- Docker configuration analysis

Output: A dependency graph and infrastructure risk report.

### Module 3: Distributed Banking Simulator

Purpose: Simulate an interconnected banking infrastructure.

We will create three independent simulated banks:

- Bank A
- Bank B
- Bank C

Each bank will have its own application service and data storage.

The banks will communicate through shared infrastructure, including a transaction-processing service.

Functions:
- Process synthetic banking transactions.
- Monitor bank availability.
- Track transaction success and failure.
- Monitor shared services.
- Record service recovery.
- Demonstrate infrastructure dependencies.

This is a synthetic environment. It will not connect to real banks or payment systems.

### Module 4: Failure Simulation and Resilience Testing

Purpose: Test how the distributed system behaves when infrastructure components fail.

Possible experiments:

- Application server shutdown.
- Transaction service shutdown.
- Database unavailability.
- Increased network latency.
- Network partition.
- Sudden transaction load.

The platform will measure:

- Service availability.
- Failed transactions.
- Recovery time.
- Transaction consistency.
- Affected services.
- Recovery behaviour.

The initial MVP will prioritise service shutdown and recovery.

### Module 5: AI Risk Analysis and Recommendations

Purpose: Convert security and infrastructure findings into understandable recommendations.

The AI receives evidence from:
- Vulnerability scans.
- Dependency graphs.
- Architecture analysis.
- Failure experiments.

It produces:
- Risk explanations.
- Root-cause analysis.
- Potential impact.
- Recommended security fixes.
- Infrastructure resilience improvements.
- Suggested recovery strategies.

AI is used for interpretation and recommendations. Actual vulnerability identification and experiment measurements are performed by deterministic tools.

---

## 5. Overall System Architecture

The platform follows a modular architecture.

**Frontend**
- Next.js
- Dashboard
- Vulnerability reports
- Architecture visualization
- Simulation controls

**Backend**
- Python
- FastAPI
- API orchestration
- Database integration

**Security Engine**
- Trivy
- OSV-Scanner
- SBOM generation
- Vulnerability parsing

**Architecture Engine**
- NetworkX
- Dependency graphs
- Single-point-of-failure analysis

**Bank Simulator**
- Bank A service
- Bank B service
- Bank C service
- Transaction service
- Failure injector

**AI Engine**
- Risk analysis
- Root-cause explanation
- Remediation recommendations

**Infrastructure**
- Docker
- PostgreSQL
- Prometheus
- Grafana

---

## 6. Proposed Technology Stack

| Technology | Purpose |
|---|---|
| Python 3.14 | Backend development |
| FastAPI | REST API |
| Next.js | Frontend |
| PostgreSQL | Data storage |
| Docker Compose | Service orchestration |
| Trivy | Vulnerability scanning |
| OSV-Scanner | OSS vulnerability detection |
| NetworkX | Dependency graph analysis |
| Prometheus | Monitoring |
| Grafana | Monitoring dashboards |
| GitHub Actions | CI/CD integration |
| AI API | Risk explanation and recommendations |

If a dependency has compatibility problems with Python 3.14, we can use Python 3.12 for the affected environment rather than allowing compatibility issues to delay the project.

---

## 7. Development Roadmap

### Phase 1: Backend Foundation — COMPLETED

- Created the ResilienceAI project folder.
- Created Python virtual environment.
- Installed initial backend dependencies.
- Created the FastAPI application.
- Implemented homepage endpoint.
- Implemented health endpoint.
- Successfully started the backend using Uvicorn.

Current backend:

`backend/main.py`

Working command:

`python -m uvicorn backend.main:app --reload`

Documentation:

`http://127.0.0.1:8000/docs`

### Phase 2: Security Engine — NEXT

- Integrate Trivy.
- Integrate OSV-Scanner.
- Implement repository scanning.
- Generate SBOM.
- Parse vulnerability results.
- Create vulnerability reporting APIs.

### Phase 3: Distributed Banking System

- Build three bank services.
- Implement synthetic transactions.
- Create transaction-processing service.
- Add independent databases.
- Implement health monitoring.

### Phase 4: Architecture Analysis

- Build dependency graphs.
- Identify shared components.
- Detect single points of failure.
- Generate infrastructure risk reports.

### Phase 5: Failure Simulation

- Implement controlled service shutdown.
- Measure affected services.
- Track failed transactions.
- Implement service recovery.
- Measure recovery time.

### Phase 6: AI Integration

- Combine security findings and architecture risks.
- Implement AI-based explanations.
- Generate remediation recommendations.
- Validate suggested fixes.

### Phase 7: Frontend and Integration

- Build dashboard.
- Connect all backend APIs.
- Visualize vulnerabilities.
- Visualize dependency graphs.
- Display simulation results.
- Display AI recommendations.

### Phase 8: Final Demonstration

- Run complete system using Docker Compose.
- Demonstrate vulnerability detection.
- Demonstrate shared infrastructure failure.
- Show impact across three banks.
- Demonstrate recovery.
- Present AI recommendations.

---

## 8. Expected Final Demonstration

The final demonstration will follow this sequence:

1. A developer submits a sample banking repository.
2. ResilienceAI scans its open-source dependencies.
3. The system identifies known vulnerabilities.
4. The architecture engine maps interconnected services.
5. The platform identifies a shared critical component.
6. The user initiates a failure experiment.
7. The shared transaction service becomes unavailable.
8. The three banking services show the actual impact.
9. The monitoring system records transaction failures and recovery.
10. AI explains the root cause and suggests improvements.
11. The team implements a remediation and demonstrates validation.

---

## 9. Innovation and Differentiation

ResilienceAI is not intended to replace existing vulnerability scanners or chaos engineering tools.

Its differentiating concept is connecting their findings.

For example:

A vulnerability scanner may identify a vulnerable package.

ResilienceAI can additionally investigate:
- Which services use that package?
- Is it used by a critical shared service?
- Which banking services depend on that component?
- What could happen if the component becomes unavailable?
- What security and resilience improvements should be implemented?

This creates a connection between software security and operational resilience.

---

## 10. Team Responsibilities

For a four-member team:

**Member 1 — Security Engine**
- Trivy integration
- OSV-Scanner integration
- SBOM
- Vulnerability analysis

**Member 2 — Distributed Systems**
- Bank A, B and C
- Transaction processing
- Failure simulation
- Recovery metrics

**Member 3 — Frontend**
- Next.js
- Dashboard
- Visualizations
- API integration

**Member 4 — Backend, AI and Integration**
- FastAPI
- Architecture analysis
- AI engine
- Docker Compose
- System integration

For three members, combine the backend and frontend integration responsibilities.

---

## 11. MVP Scope and Priorities

Must-have:
- Real vulnerability scanning.
- Three simulated banks.
- Dependency graph.
- Single-point-of-failure detection.
- Controlled failure simulation.
- Recovery measurements.
- Working dashboard.

Should-have:
- AI risk explanations.
- AI remediation recommendations.
- GitHub Actions integration.
- Security policy gates.

Future enhancements:
- Kubernetes deployment.
- Multi-region infrastructure.
- Advanced network partition testing.
- Machine-learning-based outage prediction.
- Automatic remediation pull requests.
- Continuous infrastructure monitoring.

---

## 12. Important Engineering Principles

- Security findings must come from actual scanners.
- AI must not invent CVEs or vulnerability severity.
- Architecture findings must be supported by actual dependency evidence.
- Failure experiments must run in isolated infrastructure.
- Banking transactions must be synthetic.
- Transaction consistency must be tested.
- Recovery metrics must be measured, not fabricated.
- Every module must have a clearly defined API contract.
- The system must be modular and independently testable.

---

## 13. Current Project Status

**Completed:** Initial FastAPI backend.

**Current working endpoints:**
- `GET /`
- `GET /health`

**Current development environment:**
- Windows CMD
- Python 3.14
- Virtual environment: `.venv`

**Next immediate task:**

Build ResilienceAI Security Engine v0.1.

Input: A GitHub repository URL.

Output: A structured vulnerability report generated using Trivy and OSV-Scanner.

**Development principle:** Build one working module at a time, integrate continuously, and keep the final hackathon demonstration as the guiding objective.