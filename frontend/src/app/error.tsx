// src/app/error.tsx
'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
    return (
        <div className="max-w-xl mx-auto mt-24 text-center bg-paper border border-line rounded-md p-10 shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.3em] text-bad">Something went wrong</p>
            <h2 className="font-display text-3xl font-bold text-navy mt-3">We couldn&apos;t reach the server</h2>
            <p className="text-navy-soft mt-3 text-sm">{error.message}</p>
            <button
                onClick={reset}
                className="mt-6 px-5 py-2.5 bg-navy text-paper rounded text-sm font-medium hover:bg-brass transition"
            >
                Try again
            </button>
        </div>
    );
}