// src/app/simulator/page.tsx
'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
    fetchInfrastructureGraph,
    fetchSimulationState,
    setBankFailure,
    setFailoverEnabled,
    resetSimulation,
} from '@/lib/api';
import { InfraGraph, SimulationState, SimTransaction } from '@/lib/types';
import { InfrastructureMap } from '@/app/components/widgets/InfrastructureMap';
import PageHeader from '@/app/components/ui/PageHeader';

const banks = [
    { id: 'bank-a', label: 'Bank A' },
    { id: 'bank-b', label: 'Bank B' },
    { id: 'bank-c', label: 'Bank C' },
];

const statusStyles: Record<SimTransaction['status'], string> = {
    SUCCESS: 'bg-ok/15 text-ok',
    REROUTED: 'bg-warn/15 text-warn',
    FAILED: 'bg-bad/15 text-bad',
};

export default function SimulatorPage() {
    const [baseGraph, setBaseGraph] = useState<InfraGraph | null>(null);
    const [graphError, setGraphError] = useState<string | null>(null);
    const [sim, setSim] = useState<SimulationState | null>(null);
    const [simError, setSimError] = useState<string | null>(null);
    const [running, setRunning] = useState(true);

    useEffect(() => {
        fetchInfrastructureGraph()
            .then(setBaseGraph)
            .catch((e: Error) => setGraphError(e.message));
    }, []);

    const refreshing = useRef(false);
    const refresh = useCallback(async () => {
        if (refreshing.current) return;
        refreshing.current = true;
        try {
            setSim(await fetchSimulationState());
            setSimError(null);
        } catch (e) {
            setSimError((e as Error).message);
        } finally { refreshing.current = false; }
    }, []);

    // Poll the simulation once a second while running
    useEffect(() => {
        if (!running) return;
        refresh();
        const id = setInterval(refresh, 1000);
        return () => clearInterval(id);
    }, [running, refresh]);

    // Run an action, then refresh right away so the UI updates instantly
    const act = async (action: () => Promise<void>) => {
        try {
            await action();
            await refresh();
        } catch (e) {
            setSimError((e as Error).message);
        }
    };

    const downBanks = sim?.downBanks ?? [];
    const transactions = sim?.transactions ?? [];
    const failover = sim?.failover ?? true;

    const graph = useMemo<InfraGraph | null>(() => {
        if (!baseGraph) return null;
        return {
            ...baseGraph,
            nodes: baseGraph.nodes.map((n) => ({
                ...n,
                status: downBanks.includes(n.id) ? 'down' : n.status,
            })),
        };
    }, [baseGraph, downBanks]);

    const total = transactions.length;
    const failed = transactions.filter((t) => t.status === 'FAILED').length;
    const rerouted = transactions.filter((t) => t.status === 'REROUTED').length;
    const successRate = total === 0 ? 0 : Math.round(((total - failed) / total) * 100);
    const bankLabel = (id: string) => banks.find((b) => b.id === id)?.label ?? id;

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <PageHeader
                index="04"
                eyebrow="Simulation"
                title="Resilience Simulator"
                subtitle="Measured synthetic bank transactions. Failures recover automatically after 5 seconds."
            />

            {simError && (
                <div className="bg-bad/10 border border-bad/30 text-bad text-sm rounded-md px-4 py-3">
                    Simulation unavailable: {simError}
                </div>
            )}

            <div className="bg-paper border border-line rounded-md p-4 shadow-sm flex flex-wrap items-center gap-3">
                {banks.map((b) => {
                    const isDown = downBanks.includes(b.id);
                    return (
                        <button
                            key={b.id}
                            disabled={isDown}
                            onClick={() => act(() => setBankFailure(b.id, true))}
                            className={`px-4 py-2 rounded text-sm font-medium text-paper transition ${
                                isDown ? 'bg-ok hover:bg-ok/90' : 'bg-bad hover:bg-bad/90'
                            }`}
                        >
                            {isDown ? `Recovering ${b.label}` : `Fail ${b.label}`}
                        </button>
                    );
                })}

                <label className="flex items-center gap-2 text-sm text-navy ml-4">
                    <input
                        type="checkbox"
                        checked={failover}
                        disabled
                        onChange={(e) => act(() => setFailoverEnabled(e.target.checked))}
                        className="accent-brass"
                    />
                    Automatic failover (unavailable)
                </label>

                <button
                    onClick={() => setRunning((r) => !r)}
                    className="ml-auto px-4 py-2 rounded text-sm font-medium bg-sand text-navy hover:bg-brass-soft transition"
                >
                    {running ? 'Pause' : 'Resume'}
                </button>
                <button
                    onClick={() => act(resetSimulation)}
                    className="px-4 py-2 rounded text-sm font-medium bg-sand text-navy hover:bg-brass-soft transition"
                >
                    Clear observations
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Transactions" value={total} />
                <StatCard label="Rerouted" value={rerouted} />
                <StatCard label="Failed" value={failed} />
                <StatCard label="Success rate" value={`${successRate}%`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-paper border border-line rounded-md p-4 shadow-sm">
                    {graph ? (
                        <InfrastructureMap graph={graph} />
                    ) : graphError ? (
                        <div className="p-8 text-center text-bad text-sm">
                            Could not load the infrastructure: {graphError}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-navy-soft">Loading...</div>
                    )}
                </div>

                <div className="bg-paper border border-line rounded-md p-4 shadow-sm">
                    <h2 className="font-display text-lg font-bold text-navy mb-3">Recent transactions</h2>
                    <div className="space-y-2 max-h-[480px] overflow-y-auto">
                        {transactions.length === 0 && (
                            <p className="text-sm text-navy-soft text-center pt-6">Waiting for transactions...</p>
                        )}
                        {transactions.slice(0, 12).map((t) => (
                            <div key={t.id} className="flex items-center justify-between text-sm border-b border-line pb-2">
                                <div>
                                    <p className="font-medium text-navy">{bankLabel(t.bank)}</p>
                                    <p className="text-xs text-navy-soft">{t.time}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-navy">${t.amount}</p>
                                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${statusStyles[t.status]}`}>
                                        {t.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="bg-paper border border-line border-t-2 border-t-brass rounded-md p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.2em] text-navy-soft">{label}</p>
            <p className="font-display text-3xl font-bold text-navy mt-2">{value}</p>
        </div>
    );
}