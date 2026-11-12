const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000';
export async function http<T>(path: string, init?: RequestInit): Promise<T> {
    const token = typeof window === 'undefined' ? '' : sessionStorage.getItem('resilience-token') ?? '';
    const res = await fetch(`${API_URL}${path}`, { cache: 'no-store', ...init,
        signal: init?.signal ?? AbortSignal.timeout(15000),
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init?.headers } });
    const body = await res.json();
    if (!res.ok) throw new Error(`${body.error?.message ?? res.statusText} [${body.error?.request_id ?? 'no request ID'}]`);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('resilience-fixture', {detail: body.fixture === true || body.evidence?.fixture === true}));
    return body as T;
}
