// src/app/map/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { fetchInfrastructureGraph } from '@/lib/api';
import { InfraGraph } from '@/lib/types';
import { InfrastructureMap } from '@/app/components/widgets/InfrastructureMap';
import PageHeader from '@/app/components/ui/PageHeader';

const legend = [
    { label: 'Unmeasured', color: 'bg-sand' },
    { label: 'Degraded', color: 'bg-warn' },
    { label: 'Down', color: 'bg-bad' },
    { label: 'Vulnerable', color: 'bg-info' },
];

export default function MapPage() {
    const [graph, setGraph] = useState<InfraGraph | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchInfrastructureGraph()
            .then(setGraph)
            .catch((e: Error) => setError(e.message));
    }, []);

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <PageHeader
                index="03"
                eyebrow="Infrastructure"
                title="Infrastructure Map"
                subtitle="Scanner topology and predicted impact only. Node availability is unmeasured; Simulator shows observed health."
            />

            <div className="flex gap-6">
                {legend.map((item) => (
                    <div key={item.label} className="flex items-center gap-2 text-sm text-navy-soft">
                        <span className={`w-3 h-3 rounded-full ${item.color}`} />
                        {item.label}
                    </div>
                ))}
            </div>

            <div className="bg-paper border border-line rounded-md p-4 shadow-sm">
                {graph ? (
                    <InfrastructureMap graph={graph} />
                ) : error ? (
                    <div className="p-8 text-center text-bad text-sm">
                        Could not load the infrastructure: {error}
                    </div>
                ) : (
                    <div className="p-8 text-center text-navy-soft">Loading infrastructure...</div>
                )}
            </div>
        </div>
    );
}