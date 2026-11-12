// src/app/components/ui/CommandPalette.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Command {
    id: string;
    label: string;
    hint: string;
    group: 'Pages' | 'Actions';
    href: string;
}

const commands: Command[] = [
    { id: 'overview', label: 'Overview', hint: 'Posture, health and activity', group: 'Pages', href: '/' },
    { id: 'security', label: 'Security Intelligence', hint: 'Scan a repository for vulnerabilities', group: 'Pages', href: '/security' },
    { id: 'map', label: 'Infrastructure Map', hint: 'Banks, services and dependencies', group: 'Pages', href: '/map' },
    { id: 'simulator', label: 'Resilience Simulator', hint: 'Fail a bank and watch the response', group: 'Pages', href: '/simulator' },
    { id: 'ai-risk', label: 'AI Risk Analysis', hint: 'Explanations and recommendations', group: 'Pages', href: '/ai-risk' },
    { id: 'run-sim', label: 'Run a failure simulation', hint: 'Open the simulator', group: 'Actions', href: '/simulator' },
    { id: 'scan', label: 'Scan a repository', hint: 'Open Security Intelligence', group: 'Actions', href: '/security' },
    { id: 'critical', label: 'Review the critical vulnerability', hint: 'Jump to its AI analysis', group: 'Actions', href: '/ai-risk?id=1' },
];

export default function CommandPalette() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);

    const openPalette = useCallback(() => {
        setQuery('');
        setActive(0);
        setOpen(true);
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const isK = e.code === 'KeyK' || e.key.toLowerCase() === 'k';
            const target = e.target as HTMLElement | null;
            const typing =
                target?.tagName === 'INPUT' ||
                target?.tagName === 'TEXTAREA' ||
                target?.isContentEditable;

            if ((e.ctrlKey || e.metaKey) && isK) {
                e.preventDefault();
                e.stopPropagation();
                setOpen((prev) => {
                    if (!prev) {
                        setQuery('');
                        setActive(0);
                    }
                    return !prev;
                });
            } else if (e.key === '/' && !typing) {
                e.preventDefault();
                openPalette();
            } else if (e.key === 'Escape') {
                setOpen(false);
            }
        };

        const onOpenEvent = () => openPalette();

        // Capture phase so the page handles the shortcut before the browser does
        window.addEventListener('keydown', onKey, true);
        window.addEventListener('open-command-palette', onOpenEvent);
        return () => {
            window.removeEventListener('keydown', onKey, true);
            window.removeEventListener('open-command-palette', onOpenEvent);
        };
    }, [openPalette]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return commands;
        return commands.filter((c) => `${c.label} ${c.hint} ${c.group}`.toLowerCase().includes(q));
    }, [query]);

    const go = (cmd: Command) => {
        setOpen(false);
        router.push(cmd.href);
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[60] bg-navy/40 backdrop-blur-sm flex items-start justify-center pt-[15vh] px-4"
            onClick={() => setOpen(false)}
        >
            <div
                className="w-full max-w-xl bg-paper border border-line rounded-md shadow-2xl overflow-hidden"
                style={{ animation: 'rise 0.25s cubic-bezier(0.2, 0.7, 0.2, 1) both' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 px-4 py-3 border-b border-line">
                    <span className="text-brass">⌕</span>
                    <input
                        autoFocus
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setActive(0);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setActive((i) => Math.min(i + 1, filtered.length - 1));
                            } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setActive((i) => Math.max(i - 1, 0));
                            } else if (e.key === 'Enter' && filtered[active]) {
                                go(filtered[active]);
                            }
                        }}
                        placeholder="Jump to a page or action..."
                        className="flex-1 bg-transparent text-navy placeholder:text-navy-soft/60 focus:outline-none"
                    />
                    <kbd className="text-[10px] text-navy-soft border border-line rounded px-1.5 py-0.5">Esc</kbd>
                </div>

                <div className="max-h-80 overflow-y-auto pb-2">
                    {filtered.length === 0 && (
                        <p className="px-4 py-8 text-center text-sm text-navy-soft">
                            No results for &ldquo;{query}&rdquo;
                        </p>
                    )}

                    {filtered.map((cmd, i) => (
                        <div key={cmd.id}>
                            {(i === 0 || filtered[i - 1].group !== cmd.group) && (
                                <p className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-[0.25em] text-brass">
                                    {cmd.group}
                                </p>
                            )}
                            <button
                                onClick={() => go(cmd)}
                                onMouseEnter={() => setActive(i)}
                                className={`relative w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors ${
                                    i === active ? 'bg-sand' : ''
                                }`}
                            >
                                {i === active && <span className="absolute left-0 top-0 h-full w-0.5 bg-brass" />}
                                <span>
                                    <span className="block text-sm font-medium text-navy">{cmd.label}</span>
                                    <span className="block text-xs text-navy-soft">{cmd.hint}</span>
                                </span>
                                {i === active && <span className="text-xs text-navy-soft">↵</span>}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-4 px-4 py-2 border-t border-line text-[11px] text-navy-soft">
                    <span>↑↓ navigate</span>
                    <span>↵ open</span>
                    <span className="ml-auto">Ctrl K or / to toggle</span>
                </div>
            </div>
        </div>
    );
}