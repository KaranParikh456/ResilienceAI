'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import styles from './LocalAuth.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000';
type Connection = 'disconnected' | 'checking' | 'connected';

function Shield() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3 4.5 6v5.5c0 4.2 3.1 7.5 7.5 9.5 4.4-2 7.5-5.3 7.5-9.5V6L12 3Z" stroke="currentColor" strokeWidth="1.5"/><path d="m8.5 12 2.3 2.3 4.7-4.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

async function verify(token: string, signal: AbortSignal) {
  // This owner-scoped lookup authenticates before returning the expected 404.
  // It does not create records or depend on scanner/bank availability.
  const response = await fetch(`${API_URL}/api/scan/connection-check`, {
    cache: 'no-store', signal, headers: { Authorization: `Bearer ${token}` },
  });
  const body = await response.json();
  if (response.status === 404 && body.error?.code === 'scan_not_found') return;
  throw new Error(`${body.error?.message ?? 'Connection could not be verified'}${body.error?.request_id ? ` · Request ${body.error.request_id}` : ''}`);
}

export default function LocalAuth() {
  const [connection, setConnection] = useState<Connection>('disconnected');
  const [token, setToken] = useState('');
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState(false);
  const [fixture, setFixture] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null);

  useEffect(() => {
    const fixtureListener = (event: Event) => {
      if ((event as CustomEvent<boolean>).detail) setFixture(true);
    };
    window.addEventListener('resilience-fixture', fixtureListener);
    const saved = sessionStorage.getItem('resilience-token');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    if (saved) {
      setConnection('checking');
      verify(saved, controller.signal).then(() => {
        if (!controller.signal.aborted) setConnection('connected');
      }).catch(() => {
        if (!controller.signal.aborted) {
          setConnection('disconnected');
          setError('Your saved session could not be verified. Connect again to continue.');
        } else setConnection('disconnected');
      });
    }
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
      pending.current?.abort();
      window.removeEventListener('resilience-fixture', fixtureListener);
    };
  }, []);

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (connection === 'checking') return;
    const credential = token.trim().replace(/^Bearer\s+/i, '');
    if (!credential) { setError('Paste your API token to connect.'); return; }
    setError('');
    setConnection('checking');
    const controller = new AbortController();
    pending.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    try {
      await verify(credential, controller.signal);
      if (credential !== sessionStorage.getItem('resilience-token')) {
        sessionStorage.removeItem('resilience-scan');
        sessionStorage.removeItem('resilience-simulation');
      }
      sessionStorage.setItem('resilience-token', credential);
      setToken('');
      setVisible(false);
      window.location.reload();
    } catch (cause) {
      setConnection('disconnected');
      setError(controller.signal.aborted ? 'Connection timed out. Check that your local API is running.' : cause instanceof Error ? cause.message : 'Unable to connect. Try again.');
    } finally {
      window.clearTimeout(timeout);
      pending.current = null;
    }
  }

  function disconnect() {
    ['resilience-token', 'resilience-scan', 'resilience-simulation'].forEach(key => sessionStorage.removeItem(key));
    window.location.reload();
  }

  const connected = connection === 'connected';
  const showForm = !connected || editing;

  return <section className={styles.panel} aria-label="API connection">
    <div className={styles.topline}>
      <div className={styles.identity}>
        <span className={styles.emblem}><Shield /></span>
        <div><p className={styles.eyebrow}>WORKSPACE CONNECTION</p><h2 className={styles.title}>Your local command center</h2></div>
      </div>
      <span className={`${styles.badge} ${connected ? styles.online : ''}`} role="status"><span className={styles.dot}/>{connected ? 'Connected' : connection === 'checking' ? 'Verifying connection' : 'Not connected'}</span>
    </div>
    <div className={styles.endpoint}><span>API ENDPOINT</span><code>{API_URL}</code><span className={styles.endpointLine}/><span className={styles.session}>Browser session only</span></div>
    {showForm ? <form onSubmit={connect} className={styles.form}>
      <label className={styles.label} htmlFor="local-api-token">API access token <span>Required</span></label>
      <div className={styles.controls}>
        <div className={styles.inputWrap}>
          <svg className={styles.key} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="8" cy="9" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="m11 12 8 8m-3-3 2-2m-5-1 2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          <input id="local-api-token" className={styles.input} type={visible ? 'text' : 'password'} value={token} onChange={event => setToken(event.target.value)} placeholder="Paste your bearer token" autoComplete="off" spellCheck={false} autoCapitalize="none" aria-describedby={error ? 'connection-error connection-help' : 'connection-help'} aria-invalid={!!error} disabled={connection === 'checking'}/>
          <button type="button" className={styles.reveal} onClick={() => setVisible(value => !value)} aria-label={visible ? 'Hide API token' : 'Show API token'} aria-pressed={visible}>{visible ? 'Hide' : 'Show'}</button>
        </div>
        <button className={styles.primary} type="submit" disabled={!token.trim() || connection === 'checking'}>{connection === 'checking' ? 'Connecting…' : 'Connect workspace'}<span aria-hidden="true">↗</span></button>
        {editing && <button type="button" className={styles.secondary} onClick={() => {setEditing(false);setToken('');setError('');}}>Cancel</button>}
      </div>
      <p id="connection-help" className={styles.help}>Your token stays in this browser session. Connect, then scan a repository to explore its risks.</p>
    </form> : <div className={styles.connectedRow}><div><p className={styles.connectedTitle}>Authenticated and ready to explore</p><p className={styles.help}>Run a security scan to unlock your dependency map and risk analysis.</p></div><div className={styles.actions}><button className={styles.secondary} onClick={() => setEditing(true)}>Change token</button><button className={styles.disconnect} onClick={disconnect}>Disconnect</button></div></div>}
    {error && <p id="connection-error" className={styles.error} role="alert">{error}</p>}
    {fixture && <div className={styles.fixture}>Fixture mode · This view includes synthetic evidence.</div>}
  </section>;
}
