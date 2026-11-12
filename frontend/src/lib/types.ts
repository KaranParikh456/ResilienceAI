// src/lib/types.ts

/** Metric display object */
export interface MetricData {
  title: string;
  value: string | number;
  secondaryLabel?: string;
}

/** Data point for charting (e.g., time vs revenue) */
export interface ChartDataPoint {
  date: string;
  revenue: number;
}

/** Log entry for the activity stream */
export interface ActivityEntry {
  timestamp: string;
  status: 'SUCCESS' | 'FAILURE' | 'INFO';
  message: string;
}

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface Vulnerability {
    id: string;
    cveId: string;
    packageName: string;
    installedVersion: string;
    fixedVersion: string | null;
    severity: Severity;
    source: 'Trivy' | 'OSV-Scanner';
}

export type NodeStatus = 'healthy' | 'degraded' | 'down' | 'vulnerable';

export interface InfraNode {
    id: string;
    label: string;
    type: 'gateway' | 'bank' | 'service' | 'database';
    status: NodeStatus;
}

export interface InfraEdge {
    id: string;
    source: string;
    target: string;
}

export interface InfraGraph {
    nodes: InfraNode[];
    edges: InfraEdge[];
}

export interface RiskAnalysis {
    vulnerabilityId: string;
    cveId: string;
    packageName: string;
    severity: Severity;
    riskScore: number; // 0 to 100
    explanation: string;
    impactedComponents: string[];
    recommendations: string[];
}

export interface DashboardMetrics {
    totalTransactions: MetricData;
    successRate: MetricData;
    failedAttempts: MetricData;
    averageLatencyMs: MetricData;
}

export interface SimTransaction {
    id: number | string;
    bank: string; // must match an infrastructure node id, e.g. "bank-a"
    amount: number;
    status: 'SUCCESS' | 'FAILED' | 'REROUTED';
    time: string;
}

export interface SimulationState {
    downBanks: string[];
    failover: boolean;
    transactions: SimTransaction[];
}