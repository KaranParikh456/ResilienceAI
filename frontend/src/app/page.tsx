// src/app/page.tsx
import { Suspense } from 'react';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import {
    fetchDashboardMetrics,
    fetchRevenueTrendData,
    scanRepository,
    fetchInfrastructureGraph,
    fetchRiskAnalyses,
} from '@/lib/api';
import { Severity, NodeStatus } from '@/lib/types';
import { MetricKickerCard } from '@/app/components/widgets/MetricKickerCard';
import { ChartWidget } from '@/app/components/widgets/ChartWidget';
import LiveFeedStream from '@/app/components/widgets/LiveFeedStream';
import PageHeader from '@/app/components/ui/PageHeader';
import { DashboardSkeleton } from '@/app/components/ui/Skeleton';

export const metadata = { title: 'Overview' };

const severities: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const severityBar: Record<Severity, string> = {
    CRITICAL: 'bg-bad',
    HIGH: 'bg-warn',
    MEDIUM: 'bg-brass',
    LOW: 'bg-info',
};

const statusDot: Record<NodeStatus, string> = {
    healthy: 'bg-ok',
    degraded: 'bg-warn',
    down: 'bg-bad',
    vulnerable: 'bg-info',
};

// Placeholder history for the sparklines (oldest to newest).
// Replace with real data from the backend when it's available.
const trends = {
    health: [3, 3, 3, 2, 3, 2, 2],
    vulns: [9, 8, 8, 7, 7, 6, 6],
    risk: [71, 69, 68, 65, 64, 62, 60],
    success: [98.9, 99.1, 99.4, 99.2, 99.6, 99.7, 99.8],
};

const panel = 'bg-paper border border-line rounded-md p-6 shadow-sm';

function RiskRing({ score }: { score: number }) {
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - score / 100);
    const color = score >= 80 ? '#a8323e' : score >= 60 ? '#c98a2b' : score >= 40 ? '#b08d57' : '#4a6fa5';

    return (
        <div className="relative h-44 w-44 shrink-0">
            <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
                <circle cx="64" cy="64" r={radius} fill="none" stroke="#e2dccf" strokeWidth="8" />
                <circle
                    cx="64"
                    cy="64"
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className="ring-draw"
                    style={{ '--circ': circumference } as CSSProperties}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-5xl font-bold text-navy">{score}</span>
                <span className="text-[10px] uppercase tracking-[0.25em] text-navy-soft mt-1">Risk index</span>
            </div>
        </div>
    );
}

async function DashboardContent() {
    const [metrics, chartData, vulns, graph, risks] = await Promise.all([
        fetchDashboardMetrics(),
        fetchRevenueTrendData(),
        scanRepository('demo'),
        fetchInfrastructureGraph(),
        fetchRiskAnalyses(),
    ]);

    const banks = graph.nodes.filter((n) => n.type === 'bank');
    const healthyBanks = banks.filter((b) => b.status === 'healthy').length;
    const incidents = graph.nodes.filter((n) => n.status !== 'healthy');
    const criticalCount = vulns.filter((v) => v.severity === 'CRITICAL').length;
    const overallRisk = Math.round(risks.reduce((sum, r) => sum + r.riskScore, 0) / risks.length);

    const counts = severities.map((sev) => ({
        sev,
        count: vulns.filter((v) => v.severity === sev).length,
    }));
    const maxCount = Math.max(...counts.map((c) => c.count), 1);

    return (
        <>
            {/* Hero */}
            <section className="relative overflow-hidden bg-paper border border-line rounded-md shadow-sm p-8 md:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10">
                <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brass/10 blur-3xl" />

                <div className="relative max-w-2xl">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-brass">Today&apos;s briefing</p>
                    <h2 className="font-display text-4xl md:text-6xl font-bold leading-[1.05] text-navy mt-4">
                        <span className="text-brass">{healthyBanks} of {banks.length}</span> banks are operating normally.
                    </h2>
                    <p className="text-navy-soft mt-5 leading-relaxed">
                        {incidents.length} components need attention and {criticalCount} critical{' '}
                        {criticalCount === 1 ? 'vulnerability remains' : 'vulnerabilities remain'} open.
                    </p>
                    <div className="flex flex-wrap gap-3 mt-7">
                        <Link
                            href="/simulator"
                            className="px-5 py-2.5 bg-navy text-paper rounded text-sm font-medium hover:bg-brass transition"
                        >
                            Run a simulation →
                        </Link>
                        <Link
                            href="/ai-risk"
                            className="px-5 py-2.5 border border-navy/30 text-navy rounded text-sm font-medium hover:border-brass hover:text-brass transition"
                        >
                            Review risks
                        </Link>
                    </div>
                </div>

                <RiskRing score={overallRisk} />
            </section>

            {/* Key numbers */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricKickerCard
                    metric={{ title: 'Infrastructure Health', value: `${healthyBanks}/${banks.length} banks`, secondaryLabel: 'Healthy right now' }}
                    title="Infrastructure Health"
                    iconName="🏦"
                    trend={trends.health}
                />
                <MetricKickerCard
                    metric={{ title: 'Vulnerabilities', value: vulns.length, secondaryLabel: 'Found in last scan' }}
                    title="Vulnerabilities"
                    iconName="🛡️"
                    trend={trends.vulns}
                />
                <MetricKickerCard
                    metric={{ title: 'Overall Risk', value: `${overallRisk}/100`, secondaryLabel: 'AI risk score' }}
                    title="Overall Risk"
                    iconName="⚠️"
                    trend={trends.risk}
                />
                <MetricKickerCard
                    metric={metrics.successRate}
                    title="Transaction Success Rate"
                    iconName="✅"
                    trend={trends.success}
                />
            </div>

            {/* Breakdowns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className={panel}>
                    <h2 className="font-display text-lg font-bold text-navy mb-4">Vulnerabilities by severity</h2>
                    <div className="space-y-3">
                        {counts.map(({ sev, count }) => (
                            <div key={sev}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-navy-soft">{sev}</span>
                                    <span className="font-semibold text-navy">{count}</span>
                                </div>
                                <div className="h-2 bg-sand rounded-full">
                                    <div
                                        className={`h-2 rounded-full ${severityBar[sev]}`}
                                        style={{ width: `${(count / maxCount) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={panel}>
                    <h2 className="font-display text-lg font-bold text-navy mb-4">Bank health</h2>
                    <div className="space-y-3">
                        {banks.map((b) => (
                            <div key={b.id} className="flex items-center justify-between">
                                <span className="text-navy">{b.label}</span>
                                <span className="flex items-center gap-2 text-sm text-navy-soft capitalize">
                                    <span className={`w-2.5 h-2.5 rounded-full ${statusDot[b.status]}`} />
                                    {b.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={panel}>
                    <h2 className="font-display text-lg font-bold text-navy mb-1">Active incidents</h2>
                    <p className="text-sm text-navy-soft mb-4">{incidents.length} components need attention</p>
                    <div className="space-y-3">
                        {incidents.map((n) => (
                            <div key={n.id} className="flex items-center justify-between">
                                <span className="text-navy">{n.label}</span>
                                <span className="flex items-center gap-2 text-sm text-navy-soft capitalize">
                                    <span className={`w-2.5 h-2.5 rounded-full ${statusDot[n.status]}`} />
                                    {n.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Chart and feed */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <ChartWidget data={chartData} />
                </div>
                <div className="lg:col-span-1">
                    <LiveFeedStream />
                </div>
            </div>
        </>
    );
}

export default function DashboardPage() {
    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <PageHeader
                index="01"
                eyebrow="Overview"
                title="Command Overview"
                subtitle="Security posture, infrastructure health and transaction activity at a glance."
            />

            <Suspense fallback={<DashboardSkeleton />}>
                <DashboardContent />
            </Suspense>
        </div>
    );
}