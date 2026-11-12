// src/app/components/widgets/LiveFeedStream.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';

interface FeedItem {
    id: number;
    message: string;
    type: 'success' | 'failure' | 'info';
    time: string;
}

const feedTypes = [
    { type: 'success', message: 'Payment processed successfully to PayPal.' },
    { type: 'info', message: 'User "JaneDoe" updated billing address.' },
    { type: 'failure', message: 'Transaction failed due to invalid CVV code.' },
] as const;

const itemStyles = {
    success: 'bg-ok/10 border-ok',
    failure: 'bg-bad/10 border-bad',
    info: 'bg-info/10 border-info',
};

const labelStyles = {
    success: 'text-ok',
    failure: 'text-bad',
    info: 'text-info',
};

const LiveFeedStream: React.FC = () => {
    const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const intervalId = setInterval(() => {
            const newTypeData = feedTypes[Math.floor(Math.random() * feedTypes.length)];

            const newItem: FeedItem = {
                id: Date.now(),
                message: newTypeData.message,
                type: newTypeData.type,
                time: new Date().toLocaleTimeString(),
            };

            setFeedItems(prev => [newItem, ...prev].slice(0, 15));
        }, 2500);

        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }
    }, [feedItems]);

    return (
        <div className="bg-paper border border-line rounded-md p-6 shadow-sm h-[26rem] flex flex-col">
            <div className="mb-4">
                <h2 className="font-display text-xl font-bold text-navy">Live Activity</h2>
                <p className="text-sm text-navy-soft">Transactions and account events</p>
            </div>

            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                {feedItems.length === 0 && (
                    <p className="text-sm text-navy-soft text-center pt-8">Waiting for activity...</p>
                )}
                {feedItems.map((item) => (
                    <div
                        key={item.id}
                        className={`p-3 rounded border-l-4 text-sm text-navy ${itemStyles[item.type]}`}
                    >
                        <div className="flex items-center justify-between mb-0.5">
                            <span className={`text-[11px] font-semibold uppercase tracking-wider ${labelStyles[item.type]}`}>
                                {item.type}
                            </span>
                            <span className="text-xs text-navy-soft">{item.time}</span>
                        </div>
                        {item.message}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LiveFeedStream;