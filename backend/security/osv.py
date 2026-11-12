import json

from backend.security.runner import ScannerError, run_command


async def run_osv(target: str, timeout: float = 300) -> dict:
    """Run OSV-Scanner on a folder and return its JSON output as a dict."""
    code, out, err = await run_command(
        ["osv-scanner", "scan", "source", "-r", "--format", "json", target],
        timeout,
    )

    # Exit 128 with "No package sources found" means nothing to scan, not a failure.
    if code == 128 and "No package sources found" in (out + err):
        return {"results": []}

    # Exit 0 = clean, exit 1 = vulnerabilities found. Both are successful scans.
    if code not in (0, 1):
        raise ScannerError(f"osv-scanner failed (exit {code}): {err.strip()[:500]}")

    try:
        return json.loads(out)
    except json.JSONDecodeError:
        raise ScannerError("osv-scanner returned output that is not valid JSON")