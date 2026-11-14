import asyncio
import uuid

from backend.models.security import Finding, ScanReport
from backend.security.dedupe import merge_findings, summarize
from backend.security.normalizer import normalize_osv, normalize_trivy
from backend.security.osv import run_osv
from backend.security.trivy import run_trivy


async def scan_directory(
    target: str,
    repository: str,
    scan_id: str | None = None,
) -> ScanReport:
    """Run Trivy and OSV-Scanner on a folder and return one merged report."""
    scan_id = scan_id or uuid.uuid4().hex

    results = await asyncio.gather(
        run_trivy(target),
        run_osv(target),
        return_exceptions=True,
    )

    findings: list[Finding] = []
    errors: list[str] = []
    succeeded = 0

    for name, result, normalize in (
        ("trivy", results[0], normalize_trivy),
        ("osv", results[1], normalize_osv),
    ):
        if isinstance(result, Exception):
            errors.append(f"{name}: {result}")
            continue
        if isinstance(result, BaseException):
            raise result  # e.g. cancellation: don't swallow it
        try:
            findings.extend(normalize(result))
            succeeded += 1
        except Exception as exc:
            errors.append(f"{name}: could not parse output ({type(exc).__name__}: {exc})")

    merged = merge_findings(findings)

    return ScanReport(
        scan_id=scan_id,
        repository=repository,
        status="completed" if succeeded > 0 else "failed",
        summary=summarize(merged),
        findings=merged,
        errors=errors,
    )