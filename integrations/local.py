"""Run the isolated local stack without terminating existing services."""
import argparse
import json
import os
from pathlib import Path
import secrets
import socket
import subprocess
import sys
import time

from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[1]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--show-token', action='store_true', help='Display the local API token in your own terminal')
    args = parser.parse_args()
    os.chdir(ROOT)
    work = ROOT / 'work'
    work.mkdir(exist_ok=True)
    path = ROOT / '.env'
    values = dotenv_values(path) if path.exists() else {}
    additions = {
        'API_TOKENS': json.dumps({secrets.token_urlsafe(32): 'local-user'}),
        'SIMULATOR_TOKEN': secrets.token_urlsafe(32),
        'SCANNER_MODULE': 'integrations.scanner',
        'SIMULATOR_MODULE': 'integrations.simulator',
        'SIMULATOR_TARGETS': '["bank-a","bank-b","bank-c"]',
        'FAILURE_ENABLED': 'true',
        'REPOSITORY_ROOT': str(ROOT.parent).replace('\\', '/'),
        'CORS_ORIGINS': '["http://localhost:3000","http://127.0.0.1:3000"]',
        'DATABASE_PATH': 'work/local-api.db',
        'ALLOW_FIXTURES': 'false',
    }
    # Never replace existing secrets, settings, databases or frontend environment.
    with path.open('a', encoding='utf-8') as stream:
        for key, value in additions.items():
            if key not in values:
                stream.write('\n' + key + '=' + value + '\n')
    values = dotenv_values(path)
    if args.show_token:
        print(next(iter(json.loads(values['API_TOKENS']))))
        return
    for port in (8000, 8001, 8002, 8003, 3000):
        with socket.socket() as sock:
            if sock.connect_ex(('127.0.0.1', port)) == 0:
                raise SystemExit(f'Port {port} already has a service. Stop its original launcher and retry; no existing process was stopped.')
    env = dict(os.environ, **{k: v for k, v in values.items() if v is not None})
    processes, logs = [], []
    commands = [(f'bank-{bank}', [sys.executable, '-m', 'uvicorn', 'integrations.bank:app', '--host', '127.0.0.1', '--port', str(8001+i)], dict(env, BANK_ID='bank_'+bank), ROOT)
                for i, bank in enumerate('abc')]
    commands.append(('api', [sys.executable, '-m', 'uvicorn', 'backend.main:app', '--host', '127.0.0.1', '--port', '8000', '--workers', '1'], env, ROOT))
    commands.append(('frontend', ['node', str(ROOT / 'frontend/node_modules/next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', '3000'], env, ROOT / 'frontend'))
    try:
        for name, command, child_env, cwd in commands:
            log = (work / (name+'.log')).open('a', encoding='utf-8')
            logs.append(log)
            processes.append(subprocess.Popen(command, env=child_env, cwd=cwd, stdout=log, stderr=log,
                                             creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0)))
        print('Local stack: http://127.0.0.1:3000; logs: work/. Ctrl+C stops only these processes.')
        while all(p.poll() is None for p in processes):
            time.sleep(.5)
        raise RuntimeError('A local service exited; inspect work/*.log')
    except KeyboardInterrupt:
        pass
    finally:
        for process in processes:
            if process.poll() is None:
                process.terminate()
        for process in processes:
            process.wait(timeout=10)
        for log in logs:
            log.close()

if __name__ == '__main__':
    main()
