from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator


class Strict(BaseModel):
    model_config = ConfigDict(extra='forbid')


class ErrorDetail(Strict):
    code: str
    message: str
    request_id: str


class ErrorResponse(Strict):
    error: ErrorDetail


class Health(Strict):
    status: str
    capabilities: dict[str, bool] = {}


class ScanRequest(Strict):
    repository: str = Field(min_length=1, max_length=200)


class Node(Strict):
    id: str = Field(min_length=1, max_length=200)
    kind: Literal['service', 'dependency']
    label: str = Field(max_length=300)


class Edge(Strict):
    source: str
    target: str


class Finding(Strict):
    id: str
    dependency_id: str
    severity: Literal['info', 'low', 'medium', 'high', 'critical']
    description: str = Field(max_length=4000)
    remediation: str = Field(max_length=2000)


class Evidence(Strict):
    nodes: list[Node] = Field(max_length=10000)
    edges: list[Edge] = Field(max_length=50000)
    findings: list[Finding] = Field(default_factory=list, max_length=10000)
    source: str = Field(min_length=1, max_length=500)
    fixture: bool = False

    @model_validator(mode='after')
    def references(self):
        ids = {n.id for n in self.nodes}
        if len(ids) != len(self.nodes) or len({f.id for f in self.findings}) != len(self.findings):
            raise ValueError('Evidence IDs must be unique')
        if any(e.source not in ids or e.target not in ids for e in self.edges):
            raise ValueError('Topology edges must reference known nodes')
        dependencies = {n.id for n in self.nodes if n.kind == 'dependency'}
        if any(f.dependency_id not in dependencies for f in self.findings):
            raise ValueError('Findings must reference known dependencies')
        return self


class Job(Strict):
    id: str
    state: Literal['queued', 'running', 'completed', 'failed']
    evidence: Evidence | None = None
    error: str | None = None


class Impact(Strict):
    dependency_id: str
    potentially_affected_services: list[str]
    evidence_refs: list[str]


class Graph(Strict):
    scan_id: str
    nodes: list[Node]
    edges: list[Edge]
    shared_dependencies: list[Impact]
    predicted_impact: list[Impact]
    measurement: Literal['prediction_only'] = 'prediction_only'
    fixture: bool


class Bank(Strict):
    id: str
    status: Literal['up', 'down', 'degraded', 'unknown']
    observed_at: str


class Banks(Strict):
    banks: list[Bank]
    fixture: bool = False


class SimulationStart(Strict):
    scan_id: str
    targets: list[str] = Field(min_length=1, max_length=20)


class Failure(Strict):
    simulation_id: str
    target: str
    mode: Literal['timeout', 'offline', 'latency']
    duration_seconds: int = Field(ge=1, le=60)


class Simulation(Strict):
    id: str
    state: Literal['queued', 'running', 'completed', 'failed']
    measured_results: dict = {}
    fixture: bool = False


class AnalysisRequest(Strict):
    scan_id: str


class Analysis(Strict):
    mode: Literal['ai', 'deterministic_fallback']
    summary: str = Field(max_length=10000)
    remediation: list[str]
    evidence_refs: list[str]
    fixture: bool


class CreateOrder(Strict):
    product: Literal['resilience-demo']


class Capture(Strict):
    order_id: str = Field(pattern=r'^[A-Za-z0-9]{1,64}$')


class Payment(Strict):
    order_id: str
    status: str
    amount: str
    currency: Literal['USD'] = 'USD'
    approval_url: str | None = None
    capture_id: str | None = None
    environment: Literal['sandbox'] = 'sandbox'


class WebhookResult(Strict):
    accepted: bool = True
    duplicate: bool = False
