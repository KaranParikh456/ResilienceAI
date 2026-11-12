// src/app/components/widgets/MetricKickerCard.tsx
'use client';

import React from 'react';
import { MetricData } from '@/lib/types';
import AnimatedNumber from '@/app/components/ui/AnimatedNumber';

interface MetricKickerCardProps {
    metric: MetricData;
    title: string;
    iconName: string; // emoji
    trend?: number[]; // optional recent history, oldest to newest
}

function Sparkline({ data }: { data: number[] }) {
    if (data.length < 2) return null;

    const w = 96;
    const h = 32;
    const pad = 3;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((v, i) => {
        const x = pad + (i / (data.length - 1)) * (w - pad * 2);
        const y = h - pad - ((v - min) / range) * (h - pad * 2);
        return [x, y] as const;
    });

    const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const area = `${pad},${h} ${line} ${w - pad},${h}`;
    const last = points[points.length - 1];

    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-24 h-8 shrink-0 overflow-visible" aria-hidden="true">
            <polygon points={area} fill="#b08d57" opacity="0.14" />
            <polyline
                points={line}
                fill="none"
                stroke="#b08d57"
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
            />
            <circle cx={last[0]} cy={last[1]} r="2.5" fill="#1c2a3f" />
        </svg>
    );
}

export const MetricKickerCard: React.FC<MetricKickerCardProps> = ({ metric, title, iconName, trend }) => {
    return (
        <div className="group relative overflow-hidden bg-paper border border-line rounded-md p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
            <span className="absolute top-0 left-0 h-0.5 w-12 bg-brass transition-all duration-500 group-hover:w-full" />

            <div className="flex items-center justify-between">
                <h3 className="text-[11px] uppercase tracking-[0.2em] text-navy-soft">{title}</h3>
                <span className="text-lg grayscale opacity-60">{iconName}</span>
            </div>

            <p className="font-display text-4xl font-bold text-navy mt-5 tabular-nums">
                <AnimatedNumber value={metric.value} />
            </p>

            <div className="flex items-end justify-between gap-3 mt-2 min-h-8">
                <p className="text-sm text-navy-soft">{metric.secondaryLabel}</p>
                {trend && <Sparkline data={trend} />}
            </div>
        </div>
    );
};