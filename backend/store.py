import json
import sqlite3
from contextlib import contextmanager


class Store:
    def __init__(self, path):
        self.path = path
        with self.connect() as db:
            db.execute('PRAGMA journal_mode=WAL')
            db.executescript('''
            CREATE TABLE IF NOT EXISTS records (
                kind TEXT, id TEXT, owner TEXT NOT NULL, data TEXT NOT NULL,
                PRIMARY KEY(kind,id));
            CREATE TABLE IF NOT EXISTS operations (
                id TEXT PRIMARY KEY, owner TEXT NOT NULL, fingerprint TEXT NOT NULL,
                created REAL NOT NULL, result TEXT);
            CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY);
            ''')
            # BackgroundTasks are local and cannot resume safely after process death.
            for row in db.execute("SELECT id,data FROM records WHERE kind='scan'").fetchall():
                data = json.loads(row[1])
                if data['state'] in ('queued', 'running'):
                    data.update(state='failed', error='worker_restarted_retry_scan')
                    db.execute("UPDATE records SET data=? WHERE kind='scan' AND id=?", (json.dumps(data), row[0]))

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=15)
        db.row_factory = sqlite3.Row
        try:
            with db:
                yield db
        finally:
            db.close()

    def put(self, kind, id, owner, data):
        with self.connect() as db:
            db.execute('INSERT INTO records VALUES (?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data',
                       (kind, id, owner, json.dumps(data)))

    def get(self, kind, id, owner=None):
        with self.connect() as db:
            row = db.execute('SELECT * FROM records WHERE kind=? AND id=?', (kind, id)).fetchone()
        if row and (owner is None or owner == row['owner']):
            return json.loads(row['data'])
        return None
