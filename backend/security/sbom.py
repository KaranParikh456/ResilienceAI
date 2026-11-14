import json

from backend.security.runner import ScannerError, run_command


async def run_sbom(target: str, timeout: float = 300) -> dict:
    """Run Trivy on a folder and return its CycloneDX SBOM as a dict."""
    code, out, err = await run_command(
        ["trivy", "fs", "--quiet", "--format", "cyclonedx", target],
        timeout,
    )
    if code != 0:
        raise ScannerError(f"trivy sbom failed (exit {code}): {err.strip()[:500]}")
    try:
        return json.loads(out)
    except json.JSONDecodeError:
        raise ScannerError("trivy sbom returned output that is not valid JSON")


def list_packages(sbom: dict) -> list[dict]:
    """Pull a simple list of packages (name, version, purl) out of an SBOM."""
    packages = []
    for component in sbom.get("components") or []:
        if component.get("type") != "library":
            continue
        packages.append(
            {
                "name": component.get("name"),
                "version": component.get("version"),
                "purl": component.get("purl"),
            }
        )
    return packages