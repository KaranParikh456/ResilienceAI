// src/app/components/ui/PageHeader.tsx
import type { ReactNode } from 'react';

interface PageHeaderProps {
    index: string;
    eyebrow: string;
    title: string;
    subtitle: string;
    aside?: ReactNode;
}

export default function PageHeader({ index, eyebrow, title, subtitle, aside }: PageHeaderProps) {
    return (
        <header className="pb-8 border-b border-navy/15">
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-brass">
                <span className="tabular-nums">{index}</span>
                <span className="h-px w-10 bg-brass" />
                <span>{eyebrow}</span>
                <span className="ml-auto flex items-center gap-2 text-xs normal-case tracking-normal text-navy-soft">
                    <span className="pulse-dot" />
                    Live preview
                </span>
            </div>

            <div className="flex items-end justify-between gap-6 mt-5">
                <div>
                    <h1 className="font-display text-5xl md:text-6xl font-bold text-navy leading-[1.05] tracking-tight">
                        {title}
                    </h1>
                    <p className="text-navy-soft mt-4 max-w-2xl">{subtitle}</p>
                </div>
                {aside}
            </div>
        </header>
    );
}