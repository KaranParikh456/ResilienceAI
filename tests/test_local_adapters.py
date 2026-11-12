"""Live loopback banks; scanner evidence is explicitly synthetic."""
import asyncio
import os
from pathlib import Path
import subprocess
import sys
import time
from types import SimpleNamespace

import httpx
import pytest
from fastapi.testclient import TestClient

from backend.adapters import Adapter
from backend.config import Settings
from backend.main import create_app
from integrations import scanner, simulator

TOKEN = 'local-integration-test-' + 'x' * 32

def test_cyclonedx_topology():
    nodes, refs, edges = scanner.normalize({
        'metadata': {'component': {'bom-ref': 'app', 'name': 'app', 'type': 'application'}},
        'components': [{'bom-ref': 'lib', 'purl': 'pkg:pypi/example@1.0', 'name': 'example', 'version': '1.0'}],
        'dependencies': [{'ref': 'app', 'dependsOn': ['lib']}]})
    assert (refs['app'], 'pkg:pypi/example@1.0') in edges
    assert nodes[refs['app']]['kind'] == 'service'
    with pytest.raises(KeyError):
        scanner.normalize({'dependencies': [{'ref': 'absent', 'dependsOn': ['also-absent']}]})

def test_missing_scanner_fails(monkeypatch):
    monkeypatch.setattr(scanner.shutil, 'which', lambda _: None)
    with pytest.raises(RuntimeError, match='trivy'):
        asyncio.run(scanner.scan('.'))

def test_live_banks_scan_graph_simulation_recovery(tmp_path, monkeypatch):
    monkeypatch.setenv('SIMULATOR_TOKEN', TOKEN)
    monkeypatch.setattr(simulator, 'URLS', {f'bank-{c}': f'http://127.0.0.1:{18001+i}' for i,c in enumerate('abc')})
    monkeypatch.setenv('SIMULATOR_DATABASE', str(tmp_path / 'sim.db'))
    root = Path(__file__).resolve().parents[1]
    processes = []
    logs = []
    headers = {'Authorization': 'Bearer ' + TOKEN}
    try:
        for i, bank in enumerate('abc'):
            port = 18001 + i
            import socket
            with socket.socket() as sock:
                if sock.connect_ex(('127.0.0.1', port)) == 0:
                    pytest.fail(f'Port {port} is occupied; existing services preserved')
            env = dict(os.environ, BANK_ID='bank_' + bank, PYTHONPATH=str(root))
            log = (tmp_path / f'bank-{bank}.log').open('w')
            logs.append(log)
            processes.append(subprocess.Popen(
                [sys.executable, '-m', 'uvicorn', 'integrations.bank:app', '--host', '127.0.0.1', '--port', str(port)],
                cwd=tmp_path, env=env, stdout=log, stderr=log,
                creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0)))
        with httpx.Client(trust_env=False, timeout=1) as client:
            for port in (18001, 18002, 18003):
                deadline = time.time() + 20
                while True:
                    try:
                        if client.get(f'http://127.0.0.1:{port}/health', headers=headers).status_code == 200:
                            break
                    except httpx.TransportError:
                        pass
                    if time.time() > deadline:
                        pytest.fail('Bank startup failed: ' + '\n'.join(p.read_text() for p in tmp_path.glob('*.log')))
                    time.sleep(.1)
            assert client.post('http://127.0.0.1:18001/control/failure', json={}).status_code == 401
            assert client.post('http://127.0.0.1:18001/simulation/failure', headers=headers, json={'mode': 'down'}).status_code == 404
        async def fixture_scan(_):
            return {'nodes': [{'id': 'app', 'kind': 'service', 'label': 'Synthetic test service'}],
                    'edges': [], 'findings': [], 'source': 'Explicit synthetic test scanner', 'fixture': True}
        adapter = Adapter('')
        adapter.module = SimpleNamespace(scan=fixture_scan)
        repos = tmp_path / 'repos'
        (repos / 'demo').mkdir(parents=True)
        settings = Settings(_env_file=None, api_tokens={TOKEN: 'test'}, database_path=str(tmp_path / 'api.db'),
                            repository_root=repos, simulator_module='integrations.simulator',
                            simulator_targets=list(simulator.URLS), failure_enabled=True, allow_fixtures=True)
        with TestClient(create_app(settings, scanner=adapter)) as api:
            assert api.get('/api/banks/status').status_code == 401
            banks = api.get('/api/banks/status', headers=headers).json()
            assert len(banks['banks']) == 3 and all(b['status'] == 'up' for b in banks['banks'])
            scan = api.post('/api/scan', headers=headers, json={'repository': 'demo'})
            assert scan.status_code == 202 and scan.json()['state'] == 'queued'
            scan_id = scan.json()['id']
            assert api.get('/api/scan/' + scan_id, headers=headers).json()['state'] == 'completed'
            assert api.get('/api/graph/' + scan_id, headers=headers).json()['fixture'] is True
            assert api.post('/api/ai/analyze', headers=headers, json={'scan_id': scan_id}).json()['mode'] == 'deterministic_fallback'
            sim = api.post('/api/simulation/start', headers=headers, json={'scan_id': scan_id, 'targets': list(simulator.URLS)})
            assert sim.status_code == 202, sim.text
            sid = sim.json()['id']
            assert sim.json()['measured_results']['sample_count'] == 3
            request = {'simulation_id': sid, 'target': 'bank-a', 'mode': 'offline', 'duration_seconds': 2}
            result = api.post('/api/simulation/failure', headers=headers, json=request)
            assert result.status_code == 200, result.text
            assert any(t['status'] == 'FAILED' for t in result.json()['measured_results']['transactions'])
            assert api.get('/api/banks/status', headers=headers).json()['banks'][0]['status'] == 'down'
            time.sleep(2.1)
            result = api.get('/api/simulation/' + sid, headers=headers)
            assert result.json()['state'] == 'completed', result.text
            assert api.get('/api/banks/status', headers=headers).json()['banks'][0]['status'] == 'up'
            # Lost-response retry after recovery must not inject again.
            retry = api.post('/api/simulation/failure', headers=headers, json=request)
            assert retry.status_code == 200
            assert api.get('/api/banks/status', headers=headers).json()['banks'][0]['status'] == 'up'
        assert asyncio.run(simulator.status(sid))['id'] == sid
    finally:
        for process in processes:
            process.terminate()
        for process in processes:
            process.wait(timeout=10)
        for log in logs:
            log.close()
