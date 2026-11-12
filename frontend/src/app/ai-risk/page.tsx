// src/app/ai-risk/page.tsx
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchRiskAnalyses } from '@/lib/api';
import { RiskAnalysis, Severity } from '@/lib/types';
import PageHeader from '@/app/components/ui/PageHeader';

const severityStyles: Record<Severity, string> = {
    CRITICAL: 'bg-bad text-paper',
    HIGH: 'bg-warn text-paper',
    MEDIUM: 'bg-brass-soft text-navy',
    LOW: 'bg-sand text-navy-soft',
};

const scoreColor = (score: number) =>
    score >= 80 ? 'bg-bad' : score >= 60 ? 'bg-warn' : score >= 40 ? 'bg-brass' : 'bg-info';

function AiRiskContent() {
    const searchParams = useSearchParams();
    const requestedId = searchParams.get('id');

    const [analyses, setAnalyses] = useState<RiskAnalysis[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        fetchRiskAnalyses()
            .then((data) => {
                setAnalyses(data);
                const match = data.find((a) => a.vulnerabilityId === requestedId);
                setSelectedId(match?.vulnerabilityId ?? data[0]?.vulnerabilityId ?? null);
            })
            .catch((e: Error) => setError(e.message));
    }, [requestedId]);

    if (error) {
        return (
            <div className="max-w-xl mx-auto mt-24 text-center bg-paper border border-line rounded-md p-10 shadow-sm">
                <p className="text-[11px] uppercase tracking-[0.3em] text-bad">Something went wrong</p>
                <h2 className="font-display text-2xl font-bold text-navy mt-3">Could not load the risk analysis</h2>
                <p className="text-navy-soft mt-3 text-sm">{error}</p>
            </div>
        );
    }

    if (!analyses) {
        return <div className="p-8 text-center text-navy-soft">Analyzing risks...</div>;
    }

    const selected = analyses.find((a) => a.vulnerabilityId === selectedId);
    const overall = analyses.length
        ? Math.round(analyses.reduce((sum, a) => sum + a.riskScore, 0) / analyses.length)
        : 0;

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <PageHeader
                index="05"
                eyebrow="Intelligence"
                title="AI Risk Analysis"
                subtitle="What each vulnerability means for the system, and how to address it."
                aside={
                    <div className="text-right shrink-0">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-navy-soft">Overall risk</p>
                        <p className="font-display text-5xl font-bold text-navy">
                            {overall}<span className="text-lg text-navy-soft">/100</span>
                        </p>
                    </div>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-3">
                    {analyses.map((a) => (
                        <button
                            key={a.vulnerabilityId}
                            onClick={() => setSelectedId(a.vulnerabilityId)}
                            className={`w-full text-left p-4 rounded-md border transition bg-paper ${
                                a.vulnerabilityId === selectedId
                                    ? 'border-brass shadow-md border-l-4'
                                    : 'border-line hover:border-brass/60'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-navy">{a.packageName}</span>
                                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${severityStyles[a.severity]}`}>
                                    {a.severity}
                                </span>
                            </div>
                            <p className="text-xs text-navy-soft">{a.cveId}</p>
                            <div className="mt-2 h-1.5 bg-sand rounded-full">
                                <div className={`h-1.5 rounded-full ${scoreColor(a.riskScore)}`} style={{ width: `${a.riskScore}%` }} />
                            </div>
                        </button>
                    ))}
                </div>

                {selected && (
                    <div className="lg:col-span-2 bg-paper border border-line border-t-2 border-t-brass rounded-md p-6 shadow-sm space-y-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-navy">{selected.packageName}</h2>
                                <p className="text-sm text-navy-soft">{selected.cveId}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[11px] uppercase tracking-[0.2em] text-navy-soft">Risk score</p>
                                <p className="font-display text-3xl font-bold text-navy">{selected.riskScore}</p>
                            </div>
                        </div>

                        <section>
                            <h3 className="font-display font-bold text-navy mb-2">What this means</h3>
                            <p className="text-navy-soft leading-relaxed">{selected.explanation}</p>
                        </section>

                        <section>
                            <h3 className="font-display font-bold text-navy mb-2">Potentially impacted</h3>
                            <div className="flex flex-wrap gap-2">
                                {selected.impactedComponents.map((c) => (
                                    <span key={c} className="px-3 py-1 rounded bg-sand text-sm text-navy">
                                        {c}
                                    </span>
                                ))}
                            </div>
                        </section>

                        <section>
                            <h3 className="font-display font-bold text-navy mb-2">Recommended actions</h3>
                            <ol className="list-decimal list-inside space-y-1 text-navy-soft">
                                {selected.recommendations.map((r) => (
                                    <li key={r}>{r}</li>
                                ))}
                            </ol>
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AiRiskPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-navy-soft">Loading...</div>}>
            <AiRiskContent />
        </Suspense>
    );
}