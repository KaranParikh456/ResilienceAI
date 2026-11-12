// src/app/components/ui/AnimatedNumber.tsx
'use client';

import { useEffect, useState } from 'react';

export default function AnimatedNumber({
    value,
    duration = 1100,
}: {
    value: string | number;
    duration?: number;
}) {
    const text = String(value);
    const match = text.match(/^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/);

    const target = match ? parseFloat(match[2].replace(/,/g, '')) : 0;
    const decimals = match && match[2].includes('.') ? match[2].split('.')[1].length : 0;
    const hasCommas = match ? match[2].includes(',') : false;

    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!match) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setProgress(1);
            return;
        }

        let frame = 0;
        const start = performance.now();
        const tick = (now: number) => {
            const t = Math.min((now - start) / duration, 1);
            setProgress(1 - Math.pow(1 - t, 3)); // ease-out
            if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [text, duration]);

    if (!match) return <>{text}</>;

    const current = target * progress;
    const formatted = hasCommas
        ? current.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
        : current.toFixed(decimals);

    return <>{match[1]}{formatted}{match[3]}</>;
}