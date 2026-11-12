// src/app/components/widgets/InfrastructureMap.tsx
'use client';

import { useMemo } from 'react';
import { ReactFlow, Background, Controls, Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { InfraGraph, NodeStatus } from '@/lib/types';

const statusColors: Record<NodeStatus, { bg: string; border: string }> = {
    healthy: { bg: '#e6f0ea', border: '#4f8a6b' },
    degraded: { bg: '#f8eedb', border: '#c98a2b' },
    down: { bg: '#f4dfe1', border: '#a8323e' },
    vulnerable: { bg: '#e3eaf4', border: '#4a6fa5' },
};

const columnX = { gateway: 0, bank: 300, service: 600, database: 900 };

export const InfrastructureMap = ({ graph }: { graph: InfraGraph }) => {
    const { nodes, edges } = useMemo(() => {
        const rowCount: Record<string, number> = {};
        const statusById: Record<string, NodeStatus> = {};

        const nodes: Node[] = graph.nodes.map((n) => {
            const row = rowCount[n.type] ?? 0;
            rowCount[n.type] = row + 1;
            statusById[n.id] = n.status;
            const c = statusColors[n.status];

            return {
                id: n.id,
                position: { x: columnX[n.type], y: row * 130 + 40 },
                data: { label: `${n.label} · ${n.status}` },
                style: {
                    background: c.bg,
                    border: `1.5px solid ${c.border}`,
                    borderRadius: 6,
                    padding: 12,
                    fontWeight: 600,
                    fontSize: 13,
                    color: '#1c2a3f',
                    width: 190,
                },
            };
        });

        const edges: Edge[] = graph.edges.map((e) => {
            const broken = statusById[e.source] === 'down' || statusById[e.target] === 'down';
            return {
                id: e.id,
                source: e.source,
                target: e.target,
                animated: !broken,
                style: { stroke: broken ? '#a8323e' : '#9aa3b2', strokeWidth: 2 },
            };
        });

        return { nodes, edges };
    }, [graph]);

    return (
        <div style={{ width: '100%', height: 520 }}>
            <ReactFlow nodes={nodes} edges={edges} fitView>
                <Background color="#e2dccf" gap={20} />
                <Controls />
            </ReactFlow>
        </div>
    );
};