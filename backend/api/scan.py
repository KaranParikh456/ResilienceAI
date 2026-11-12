import asyncio
import uuid

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from backend.models.security import ScanReport
from backend.security.github import InvalidRepositoryURL, cloned_repo, parse_github_url
from backend.security.sbom import run_sbom
from backend.security.scanner import scan_directory

router = APIRouter(prefix="/api", tags=["security"])

# In-memory storage: scans are lost when the server restarts (fine for an MVP).
SCANS: dict[str, ScanReport] = {}
SBOMS: dict[str, dict] = {}


class ScanRequest(BaseModel):
    repository_url: str


async def _run_scan(scan_id: str, repository_url: str) -> None:
    SCANS[scan_id].status = "running"
    try:
        async with cloned_repo(repository_url) as (path, name):
            report, sbom = await asyncio.gather(
                scan_directory(path, name, scan_id=scan_id),
                run_sbom(path),
                return_exceptions=True,
            )

        if isinstance(report, BaseException):
            raise report

        if isinstance(sbom, Exception):
            report.errors.append(f"sbom: {sbom}")
        elif isinstance(sbom, BaseException):
            raise sbom
        else:
            SBOMS[scan_id] = sbom

        SCANS[scan_id] = report
    except Exception as exc:
        failed = SCANS[scan_id]
        failed.status = "failed"
        failed.errors.append(f"{type(exc).__name__}: {str(exc)[:300]}")


@router.post("/scan", response_model=ScanReport, status_code=202)
async def start_scan(request: ScanRequest, background_tasks: BackgroundTasks):
    try:
        owner, repo = parse_github_url(request.repository_url)
    except InvalidRepositoryURL as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    scan_id = uuid.uuid4().hex
    report = ScanReport(
        scan_id=scan_id,
        repository=f"{owner}/{repo}",
        status="pending",
    )
    SCANS[scan_id] = report
    background_tasks.add_task(_run_scan, scan_id, request.repository_url)
    return report


@router.get("/scan/{scan_id}", response_model=ScanReport)
async def get_scan(scan_id: str):
    report = SCANS.get(scan_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Scan not found")
    return report


@router.get("/scan/{scan_id}/sbom")
async def get_sbom(scan_id: str):
    report = SCANS.get(scan_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Scan not found")

    sbom = SBOMS.get(scan_id)
    if sbom is None:
        if report.status in ("pending", "running"):
            raise HTTPException(status_code=409, detail="Scan not finished yet")
        raise HTTPException(status_code=404, detail="No SBOM available for this scan")
    return sbom