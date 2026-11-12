# Security Engine

Scans a GitHub repository (or a local folder) with Trivy and OSV-Scanner, merges the results into one report, and generates an SBOM.

## Requirements

- Python 3.14 with `fastapi`, `uvicorn` and `pydantic`
- `trivy` and `osv-scanner` on your PATH (macOS: `brew install trivy osv-scanner`)
- `git` on your PATH (used to clone repositories)

## Use it from Python

```python
from backend.security.scanner import scan_directory

report = await scan_directory("/path/to/folder", repository="owner/repo")
```

`report` is a `ScanReport` (see `backend/models/security.py`) with `scan_id`, `repository`, `status`, `summary`, `findings` and `errors`.

## Use it from the API

Add two lines to `main.py`:

```python
from backend.api.scan import router as scan_router
app.include_router(scan_router)
```

| Endpoint | What it does |
|---|---|
| `POST /api/scan` | Body: `{"repository_url": "https://github.com/owner/repo"}`. Returns `202` with a `pending` report and a `scan_id`. The scan runs in the background. |
| `GET /api/scan/{scan_id}` | Returns the report. `status` is `pending`, `running`, `completed` or `failed`. |
| `GET /api/scan/{scan_id}/sbom` | Returns the CycloneDX SBOM. `409` if the scan is still running, `404` if unknown. |

Only `https://github.com/owner/repo` URLs are accepted (`400` otherwise).

To test without touching `main.py`, run the dev app:

```bash
python -m uvicorn backend.security_dev:app --reload --port 8001
```

## Use it from the command line

```bash
python -m backend.security.cli <folder> [--repository NAME] [--output-dir DIR] [--fail-on critical|high|medium|low|never]
```

Writes `security-report.json` and `sbom.cdx.json` to the output folder (default `scans/`).

| Exit code | Meaning |
|---|---|
| 0 | Scan finished, nothing at or above the `--fail-on` severity (default `critical`) |
| 1 | Findings at or above the `--fail-on` severity |
| 2 | The scan itself failed, or the folder does not exist |

## Finding format

Each finding has `vulnerability_id`, `package_name`, `installed_version`, `fixed_version`, `severity`, `description`, `references`, `source_file` and `detected_by`.

- The same vulnerability found by both scanners becomes one finding, with `detected_by: ["osv", "trivy"]`.
- `severity` is `CRITICAL`, `HIGH`, `MEDIUM`, `LOW` or `UNKNOWN`. `UNKNOWN` means the advisory had no severity score. Nothing is guessed.
- If a scanner fails, the reason is listed in `errors`. Status is `failed` only if both scanners fail.

## Safety

- Repositories are cloned shallowly, with submodules, hooks and password prompts disabled, and a timeout.
- Nothing from a scanned repository is ever executed. The scanners only read files.
- Scanner commands are run without a shell and cannot be set by API callers.

## Known limitations

- Scan results are kept in memory and are lost when the server restarts.
- OSV-Scanner reports transitive dependencies, so it can find vulnerabilities Trivy does not. Trivy's SBOM lists only the packages declared in dependency files.
- A repository with no dependency files has no findings. That is a correct result, not an error.
- Scans use the cloned repository's default branch only.

## GitHub Actions

`.github/workflows/security-scan.yml` installs pinned, checksum-verified releases of Trivy and OSV-Scanner, scans the repo (excluding `tests/fixtures`, which is deliberately vulnerable), and uploads the report and SBOM as a build artifact. The build fails on critical findings.

Trivy's third-party GitHub Actions were compromised in March 2026, so this workflow does not use them.