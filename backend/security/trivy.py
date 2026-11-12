import json

from backend.security.runner import ScannerError, run_command


async def run_trivy(target: str, timeout: float = 300) -> dict:
    """Run Trivy on a folder and return its JSON output as a dict."""
    code, out, err = await run_command(
        ["trivy", "fs", "--quiet", "--scanners", "vuln", "--format", "json", target],
        timeout,
    )
    if code != 0:
        raise ScannerError(f"trivy failed (exit {code}): {err.strip()[:500]}")
    try:
        return json.loads(out)
    except json.JSONDecodeError:
        raise ScannerError("trivy returned output that is not valid JSON")