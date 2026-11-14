from backend.models.security import Finding, ScanSummary

SEVERITY_RANK = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1, "UNKNOWN": 0}


def _key(finding: Finding) -> tuple[str, str]:
    """Two findings are the same bug if the ID and package name match."""
    return (
        finding.vulnerability_id.upper(),
        finding.package_name.lower().replace("_", "-"),
    )


def merge_findings(findings: list[Finding]) -> list[Finding]:
    """Combine duplicate findings from different scanners into one entry."""
    merged: dict[tuple[str, str], Finding] = {}

    for f in findings:
        key = _key(f)
        existing = merged.get(key)
        if existing is None:
            merged[key] = f.model_copy(deep=True)
            continue

        for scanner in f.detected_by:
            if scanner not in existing.detected_by:
                existing.detected_by.append(scanner)

        if SEVERITY_RANK[f.severity] > SEVERITY_RANK[existing.severity]:
            existing.severity = f.severity

        existing.fixed_version = existing.fixed_version or f.fixed_version
        existing.description = existing.description or f.description
        existing.source_file = existing.source_file or f.source_file

        for url in f.references:
            if url not in existing.references:
                existing.references.append(url)

    result = list(merged.values())
    for f in result:
        f.detected_by.sort()
    result.sort(key=lambda f: (-SEVERITY_RANK[f.severity], f.package_name, f.vulnerability_id))
    return result


def summarize(findings: list[Finding]) -> ScanSummary:
    """Count findings by severity."""
    summary = ScanSummary(total=len(findings))
    for f in findings:
        setattr(summary, f.severity.lower(), getattr(summary, f.severity.lower()) + 1)
    return summary