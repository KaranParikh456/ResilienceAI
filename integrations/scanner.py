"""Real CycloneDX topology and vulnerability evidence; never execute target code."""
import asyncio
import hashlib
import json
import shutil

async def command(*args, accepted=(0,)):
    proc = await asyncio.create_subprocess_exec(*args, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    async def read(stream):
        chunks = bytearray()
        while chunk := await stream.read(65536):
            chunks.extend(chunk)
            if len(chunks) > 32 * 1024 * 1024:
                raise RuntimeError('Scanner output exceeds 32 MiB')
        return chunks.decode(errors='replace')
    try:
        async with asyncio.timeout(85):
            out, err = await asyncio.gather(read(proc.stdout), read(proc.stderr))
            code = await proc.wait()
        if code not in accepted:
            raise RuntimeError(f'{args[0]} failed ({code}): {err[:500]}')
        return out
    finally:
        if proc.returncode is None:
            proc.kill()
            await proc.wait()

def normalize(sbom):
    components = list(sbom.get('components', []))
    root = sbom.get('metadata', {}).get('component')
    if root:
        components.append(root)
    nodes, refs = {}, {}
    for c in components:
        ref = c.get('bom-ref')
        if not ref:
            raise ValueError('CycloneDX component missing bom-ref')
        kind = 'service' if c.get('type') == 'application' else 'dependency'
        id = c.get('purl') or 'cdx:' + hashlib.sha256(ref.encode()).hexdigest()
        refs[ref] = id
        nodes[id] = dict(id=id, kind=kind, label=(c.get('name', ref) + '@' + c.get('version', 'unknown'))[:300])
    edges = set()
    for d in sbom.get('dependencies', []):
        for target in d.get('dependsOn', []):
            edges.add((refs[d['ref']], refs[target]))
    return nodes, refs, edges

async def scan(repository_path):
    for tool in ('trivy', 'osv-scanner'):
        if not shutil.which(tool):
            raise RuntimeError(f'{tool} is not installed or not on PATH')
    tv = (await command('trivy', '--version')).splitlines()[0]
    ov = (await command('osv-scanner', '--version')).splitlines()[0]
    sbom = json.loads(await command('trivy', 'fs', '--quiet', '--scanners', 'vuln', '--format', 'cyclonedx', repository_path))
    # Run the second engine against the same SBOM, preserving package identities.
    import tempfile
    from pathlib import Path
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / 'sbom.cdx.json'
        path.write_text(json.dumps(sbom), encoding='utf-8')
        osv = json.loads(await command('osv-scanner', 'scan', '--format', 'json', '--sbom', str(path), accepted=(0, 1)))
    nodes, refs, edges = normalize(sbom)
    findings = {}
    def add(vid, dep, severity, description, remediation):
        if nodes[dep]['kind'] != 'dependency':
            return
        key = vid + ':' + hashlib.sha256(dep.encode()).hexdigest()[:16]
        findings[key] = dict(id=key, dependency_id=dep, severity=severity if severity in ('low','medium','high','critical') else 'info', description=description[:4000], remediation=remediation[:2000])
    for v in sbom.get('vulnerabilities', []):
        ratings = v.get('ratings') or [{}]
        for affected in v.get('affects', []):
            add(v['id'], refs[affected['ref']], ratings[0].get('severity','info').lower(), v.get('description') or v['id'], v.get('recommendation') or 'Review vendor advisory for a fixed version.')
    for result in osv.get('results', []):
        for entry in result.get('packages', []):
            p = entry.get('package', {})
            # Match exact SBOM name AND version; never infer topology from names.
            matches = {refs[c['bom-ref']] for c in sbom.get('components', []) if c.get('name') == p.get('name') and c.get('version') == p.get('version')}
            if len(matches) != 1 and entry.get('vulnerabilities'):
                raise ValueError('OSV package identity ambiguous or absent in SBOM')
            for v in entry.get('vulnerabilities', []):
                for dep in matches:
                    add(v['id'], dep, v.get('database_specific',{}).get('severity','info').lower(), v.get('details') or v.get('summary') or v['id'], 'Review OSV advisory for fixed versions.')
    return dict(nodes=list(nodes.values()), edges=[dict(source=a,target=b) for a,b in sorted(edges)], findings=list(findings.values()), source=f'{tv}; {ov}; CycloneDX {sbom.get("specVersion", "unknown")}'[:500], fixture=False)
