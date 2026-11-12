from typing import Literal

from pydantic import BaseModel, Field

Severity = Literal["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN"]
Scanner = Literal["trivy", "osv"]


class Finding(BaseModel):
    """One vulnerability, in a common format for every scanner."""

    vulnerability_id: str
    package_name: str
    installed_version: str
    fixed_version: str | None = None
    severity: Severity = "UNKNOWN"
    description: str | None = None
    references: list[str] = Field(default_factory=list)
    source_file: str | None = None
    detected_by: list[Scanner] = Field(default_factory=list)


class ScanSummary(BaseModel):
    total: int = 0
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    unknown: int = 0


class ScanReport(BaseModel):
    scan_id: str
    repository: str
    status: Literal["pending", "running", "completed", "failed"]
    summary: ScanSummary = Field(default_factory=ScanSummary)
    findings: list[Finding] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)