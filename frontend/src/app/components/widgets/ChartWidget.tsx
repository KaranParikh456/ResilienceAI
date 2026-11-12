// src/app/components/widgets/ChartWidget.tsx
'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartDataPoint } from '@/lib/types';

export const ChartWidget = ({ data }: { data: ChartDataPoint[] }) => {
    return (
        <div className="bg-paper border border-line rounded-md p-6 shadow-sm h-[26rem] flex flex-col">
            <div className="mb-4">
                <h2 className="font-display text-xl font-bold text-navy">Daily Revenue</h2>
                <p className="text-sm text-navy-soft">Last seven days</p>
            </div>

            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2dccf" />
                        <XAxis dataKey="date" tick={{ fill: '#5b6678', fontSize: 12 }} stroke="#e2dccf" />
                        <YAxis
                            tickFormatter={(value: number) => `$${(value / 1000).toFixed(0)}k`}
                            tick={{ fill: '#5b6678', fontSize: 12 }}
                            stroke="#e2dccf"
                        />
                        <Tooltip
                            formatter={(value, name) => [`$${Number(value).toLocaleString()}`, name]}
                            labelFormatter={(label) => `Date: ${label}`}
                            contentStyle={{
                                background: '#fbfaf7',
                                border: '1px solid #e2dccf',
                                borderRadius: 6,
                                color: '#1c2a3f',
                            }}
                        />
                        <Line
                            type="monotone"
                            dataKey="revenue"
                            name="Revenue"
                            stroke="#1c2a3f"
                            strokeWidth={2.5}
                            dot={{ r: 3.5, fill: '#fbfaf7', stroke: '#1c2a3f', strokeWidth: 2 }}
                            activeDot={{ r: 6, fill: '#b08d57', stroke: '#1c2a3f' }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};