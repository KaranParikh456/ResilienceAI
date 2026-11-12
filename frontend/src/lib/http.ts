// src/lib/http.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

// The simulator can live on a different port (Member 2's service)
export const SIM_URL = process.env.NEXT_PUBLIC_SIM_URL ?? API_URL;

// true = built-in fake data, false = call a real backend
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== 'false';
export const USE_MOCK_SIM =
    (process.env.NEXT_PUBLIC_USE_MOCK_SIM ?? process.env.NEXT_PUBLIC_USE_MOCK) !== 'false';

export async function http<T>(
    path: string,
    init?: RequestInit,
    baseUrl: string = API_URL
): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
        cache: 'no-store',
        ...init,
        headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });

    if (!res.ok) {
        throw new Error(`Request to ${path} failed (${res.status} ${res.statusText})`);
    }

    // Some POST endpoints return an empty body
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
}