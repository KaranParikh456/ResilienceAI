from backend.models.security import Finding

VALID_SEVERITIES = {"CRITICAL", "HIGH", "MEDIUM", "LOW"}


def normalize_trivy(trivy_json: dict) -> list[Finding]:
    """Convert Trivy's JSON output into a list of Finding objects."""
    findings: list[Finding] = []

    for result in trivy_json.get("Results") or []:
        source_file = result.get("Target")

        for vuln in result.get("Vulnerabilities") or []:
            severity = (vuln.get("Severity") or "UNKNOWN").upper()
            if severity not in VALID_SEVERITIES:
                severity = "UNKNOWN"

            findings.append(
                Finding(
                    vulnerability_id=vuln["VulnerabilityID"],
                    package_name=vuln["PkgName"],
                    installed_version=vuln["InstalledVersion"],
                    fixed_version=vuln.get("FixedVersion") or None,
                    severity=severity,
                    description=vuln.get("Description") or vuln.get("Title"),
                    references=vuln.get("References") or [],
                    source_file=source_file,
                    detected_by=["trivy"],
                )
            )

    return findings


def _severity_from_score(score) -> str:
    """OSV gives severity as a number (like 8.7). Convert it to a word."""
    try:
        s = float(score)
    except (TypeError, ValueError):
        return "UNKNOWN"
    if s >= 9.0:
        return "CRITICAL"
    if s >= 7.0:
        return "HIGH"
    if s >= 4.0:
        return "MEDIUM"
    if s > 0:
        return "LOW"
    return "UNKNOWN"


def _normalize_name(name: str) -> str:
    return name.lower().replace("_", "-")


def _fixed_versions(vuln: dict, package_name: str) -> str | None:
    """Dig the 'fixed' versions out of OSV's nested 'affected' data."""
    fixed: list[str] = []
    for affected in vuln.get("affected") or []:
        affected_name = (affected.get("package") or {}).get("name", "")
        if _normalize_name(affected_name) != _normalize_name(package_name):
            continue
        for rng in affected.get("ranges") or []:
            if rng.get("type") != "ECOSYSTEM":
                continue
            for event in rng.get("events") or []:
                version = event.get("fixed")
                if version and version not in fixed:
                    fixed.append(version)
    return ", ".join(fixed) or None


def normalize_osv(osv_json: dict) -> list[Finding]:
    """Convert OSV-Scanner's JSON output into a list of Finding objects."""
    findings: list[Finding] = []

    for result in osv_json.get("results") or []:
        source_file = (result.get("source") or {}).get("path")

        for pkg_entry in result.get("packages") or []:
            pkg = pkg_entry.get("package") or {}
            name = pkg.get("name")
            version = pkg.get("version")
            if not name or not version:
                continue

            vulns_by_id = {
                v["id"]: v for v in pkg_entry.get("vulnerabilities") or []
            }

            for group in pkg_entry.get("groups") or []:
                ids = group.get("ids") or []
                members = [vulns_by_id[i] for i in ids if i in vulns_by_id]
                if not members:
                    continue

                all_ids = set(ids) | set(group.get("aliases") or [])
                cve_ids = sorted(i for i in all_ids if i.startswith("CVE-"))
                vulnerability_id = cve_ids[0] if cve_ids else ids[0]

                fixed = None
                description = None
                references: list[str] = []
                for member in members:
                    fixed = fixed or _fixed_versions(member, name)
                    description = (
                        description or member.get("details") or member.get("summary")
                    )
                    for ref in member.get("references") or []:
                        url = ref.get("url")
                        if url and url not in references:
                            references.append(url)

                findings.append(
                    Finding(
                        vulnerability_id=vulnerability_id,
                        package_name=name,
                        installed_version=version,
                        fixed_version=fixed,
                        severity=_severity_from_score(group.get("max_severity")),
                        description=description,
                        references=references,
                        source_file=source_file,
                        detected_by=["osv"],
                    )
                )

    return findings