import argparse
import asyncio
import json
import sys
from pathlib import Path

from backend.security.dedupe import SEVERITY_RANK
from backend.security.sbom import run_sbom
from backend.security.scanner import scan_directory


async def _scan_and_sbom(target: str, repository: str):
    return await asyncio.gather(
        scan_directory(target, repository),
        run_sbom(target),
        return_exceptions=True,
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Scan a local folder with Trivy and OSV-Scanner."
    )
    parser.add_argument("target", help="folder to scan")
    parser.add_argument("--repository", default=None, help="name shown in the report")
    parser.add_argument("--output-dir", default="scans", help="where to write results")
    parser.add_argument(
        "--fail-on",
        choices=["critical", "high", "medium", "low", "never"],
        default="critical",
        help="exit with code 1 if a finding at this severity or above exists",
    )
    args = parser.parse_args(argv)

    target = Path(args.target)
    if not target.is_dir():
        print(f"error: {args.target} is not a folder", file=sys.stderr)
        return 2

    repository = args.repository or target.resolve().name
    report, sbom = asyncio.run(_scan_and_sbom(str(target), repository))

    if isinstance(report, BaseException):
        print(f"error: scan crashed: {report}", file=sys.stderr)
        return 2

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    if isinstance(sbom, BaseException):
        report.errors.append(f"sbom: {sbom}")
    else:
        (out_dir / "sbom.cdx.json").write_text(json.dumps(sbom, indent=2))

    (out_dir / "security-report.json").write_text(report.model_dump_json(indent=2))

    print(f"repository: {report.repository}")
    print(f"status:     {report.status}")
    print(f"summary:    {report.summary}")
    for error in report.errors:
        print(f"error:      {error[:200]}", file=sys.stderr)
    print(f"results written to {out_dir}/")

    if report.status == "failed":
        return 2

    if args.fail_on != "never":
        threshold = SEVERITY_RANK[args.fail_on.upper()]
        blocking = [f for f in report.findings if SEVERITY_RANK[f.severity] >= threshold]
        if blocking:
            print(f"FAIL: {len(blocking)} finding(s) at {args.fail_on} or above")
            return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())