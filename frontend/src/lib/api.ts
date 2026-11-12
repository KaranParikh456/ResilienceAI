// src/lib/api.ts
import { http, USE_MOCK, USE_MOCK_SIM, SIM_URL } from '@/lib/http';
import { MetricData, ChartDataPoint, ActivityEntry, Vulnerability, InfraGraph, RiskAnalysis, DashboardMetrics, SimTransaction, SimulationState } from '@/lib/types';

/** Fetches aggregated metrics for the dashboard */
export const fetchDashboardMetrics = async (): Promise<{
  totalTransactions: MetricData;
  successRate: MetricData;
  failedAttempts: MetricData;
  averageLatencyMs: MetricData;
}> => {
    if (!USE_MOCK) return http<DashboardMetrics>('/api/metrics');
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  return {
    totalTransactions: { title: "Total Transactions", value: "124,392", secondaryLabel: "Since inception" },
    successRate: { title: "Success Rate", value: "98.7%", secondaryLabel: "Last 24 hours" },
    failedAttempts: { title: "Failed Attempts", value: 567, secondaryLabel: "Requires review" },
    averageLatencyMs: { title: "Avg Latency", value: 350, secondaryLabel: "ms" },
  };
};

/** Fetches historical revenue data for the chart widget */
export const fetchRevenueTrendData = async (): Promise<ChartDataPoint[]> => {
    if (!USE_MOCK) return http<ChartDataPoint[]>('/api/revenue');
  await new Promise(resolve => setTimeout(resolve, 600));

  const data: ChartDataPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    data.push({
      date: day.toISOString().split('T')[0],
      revenue: Math.floor(Math.random() * 15000) + 1000,
    });
  }
  return data;
};

/** Fetches the initial batch of activity logs and handles streaming simulation */
export const fetchActivityStream = async (): Promise<ActivityEntry[]> => {
    if (!USE_MOCK) return http<ActivityEntry[]>('/api/activity');
  await new Promise(resolve => setTimeout(resolve, 800)); // Simulate initial load delay
  
  const initialLogs: ActivityEntry[] = [
    { timestamp: new Date(Date.now() - 120000).toLocaleTimeString(), status: 'INFO', message: "User initiated account verification." },
    { timestamp: new Date(Date.now() - 80000).toLocaleTimeString(), status: 'SUCCESS', message: "Successful payment processing for $45.99." },
    { timestamp: new Date(Date.now() - 30000).toLocaleTimeString(), status: 'FAILURE', message: "Payment declined: Insufficient funds (Card ending in ****1234)." },
  ];

  // Simulate the stream by returning the initial logs first
  return initialLogs;
};

export const scanRepository = async (repoUrl: string): Promise<Vulnerability[]> => {
    if (!USE_MOCK) return http<Vulnerability[]>('/api/scan', { method: 'POST', body: JSON.stringify({ repoUrl }) });
    console.log('Scanning', repoUrl);
    await new Promise(resolve => setTimeout(resolve, 1500));

    return [
        { id: '1', cveId: 'CVE-2024-45337', packageName: 'golang.org/x/crypto', installedVersion: '0.21.0', fixedVersion: '0.31.0', severity: 'CRITICAL', source: 'Trivy' },
        { id: '2', cveId: 'CVE-2023-26136', packageName: 'tough-cookie', installedVersion: '4.0.0', fixedVersion: '4.1.3', severity: 'HIGH', source: 'OSV-Scanner' },
        { id: '3', cveId: 'CVE-2024-21538', packageName: 'cross-spawn', installedVersion: '7.0.3', fixedVersion: '7.0.5', severity: 'HIGH', source: 'Trivy' },
        { id: '4', cveId: 'CVE-2024-4067', packageName: 'micromatch', installedVersion: '4.0.5', fixedVersion: '4.0.8', severity: 'MEDIUM', source: 'OSV-Scanner' },
        { id: '5', cveId: 'CVE-2022-25883', packageName: 'semver', installedVersion: '7.3.7', fixedVersion: '7.5.2', severity: 'MEDIUM', source: 'Trivy' },
        { id: '6', cveId: 'CVE-2023-45857', packageName: 'axios', installedVersion: '0.21.1', fixedVersion: null, severity: 'LOW', source: 'OSV-Scanner' },
    ];
};

export const fetchInfrastructureGraph = async (): Promise<InfraGraph> => {
    if (!USE_MOCK) return http<InfraGraph>('/api/infrastructure');
    await new Promise(resolve => setTimeout(resolve, 400));

    return {
        nodes: [
            { id: 'gateway', label: 'Payment Gateway', type: 'gateway', status: 'healthy' },
            { id: 'bank-a', label: 'Bank A', type: 'bank', status: 'healthy' },
            { id: 'bank-b', label: 'Bank B', type: 'bank', status: 'degraded' },
            { id: 'bank-c', label: 'Bank C', type: 'bank', status: 'down' },
            { id: 'processor', label: 'Payment Processor', type: 'service', status: 'healthy' },
            { id: 'auth', label: 'Auth Service', type: 'service', status: 'vulnerable' },
            { id: 'ledger', label: 'Ledger Service', type: 'service', status: 'healthy' },
            { id: 'db', label: 'Transactions DB', type: 'database', status: 'healthy' },
        ],
        edges: [
            { id: 'e1', source: 'gateway', target: 'bank-a' },
            { id: 'e2', source: 'gateway', target: 'bank-b' },
            { id: 'e3', source: 'gateway', target: 'bank-c' },
            { id: 'e4', source: 'bank-a', target: 'processor' },
            { id: 'e5', source: 'bank-b', target: 'processor' },
            { id: 'e6', source: 'bank-c', target: 'auth' },
            { id: 'e7', source: 'processor', target: 'ledger' },
            { id: 'e8', source: 'auth', target: 'ledger' },
            { id: 'e9', source: 'ledger', target: 'db' },
        ],
    };
};

export const fetchRiskAnalyses = async (): Promise<RiskAnalysis[]> => {
    if (!USE_MOCK) return http<RiskAnalysis[]>('/api/risk-analyses');
    await new Promise(resolve => setTimeout(resolve, 600));

    return [
        {
            vulnerabilityId: '1',
            cveId: 'CVE-2024-45337',
            packageName: 'golang.org/x/crypto',
            severity: 'CRITICAL',
            riskScore: 92,
            explanation: 'A flaw in how this crypto library handles SSH authentication can let an attacker get past access checks. Since the Auth Service depends on it, a successful attack could expose every bank connection routed through it.',
            impactedComponents: ['Auth Service', 'Bank C', 'Ledger Service'],
            recommendations: [
                'Upgrade golang.org/x/crypto from 0.21.0 to 0.31.0',
                'Rotate credentials used by the Auth Service',
                'Add a secondary auth path so Bank C is not a single point of failure',
            ],
        },
        {
            vulnerabilityId: '2',
            cveId: 'CVE-2023-26136',
            packageName: 'tough-cookie',
            severity: 'HIGH',
            riskScore: 74,
            explanation: 'This cookie library can be tricked into modifying objects it should not touch (prototype pollution). It could corrupt session handling in the Payment Gateway, causing failed or duplicated payments.',
            impactedComponents: ['Payment Gateway', 'Payment Processor'],
            recommendations: [
                'Upgrade tough-cookie from 4.0.0 to 4.1.3',
                'Validate cookie input at the gateway',
            ],
        },
        {
            vulnerabilityId: '3',
            cveId: 'CVE-2024-21538',
            packageName: 'cross-spawn',
            severity: 'HIGH',
            riskScore: 68,
            explanation: 'Specially crafted input can make this package consume huge amounts of CPU (a ReDoS attack). Under load, the Payment Processor could slow down enough to time out transactions.',
            impactedComponents: ['Payment Processor', 'Bank A', 'Bank B'],
            recommendations: [
                'Upgrade cross-spawn from 7.0.3 to 7.0.5',
                'Add request timeouts and rate limiting in front of the processor',
            ],
        },
        {
            vulnerabilityId: '4',
            cveId: 'CVE-2024-4067',
            packageName: 'micromatch',
            severity: 'MEDIUM',
            riskScore: 45,
            explanation: 'A pattern-matching bug that can be abused to slow down build and tooling processes. Limited direct impact on live payments.',
            impactedComponents: ['Build pipeline'],
            recommendations: ['Upgrade micromatch from 4.0.5 to 4.0.8'],
        },
        {
            vulnerabilityId: '6',
            cveId: 'CVE-2023-45857',
            packageName: 'axios',
            severity: 'LOW',
            riskScore: 22,
            explanation: 'A token-leak issue in this HTTP client under specific cross-site conditions. No fixed version is available yet, so the risk needs to be managed rather than patched.',
            impactedComponents: ['Dashboard frontend'],
            recommendations: [
                'Avoid sending sensitive tokens in cross-site requests',
                'Monitor the package for a patched release',
            ],
        },
    ];
};

// ---------- Simulator ----------

// Local fake engine, used only when USE_MOCK_SIM is true
const mockSim: SimulationState = { downBanks: [], failover: true, transactions: [] };

const mockTick = () => {
    const banks = ['bank-a', 'bank-b', 'bank-c'];
    const target = banks[Math.floor(Math.random() * banks.length)];
    let bank = target;
    let status: SimTransaction['status'] = 'SUCCESS';

    if (mockSim.downBanks.includes(target)) {
        const healthy = banks.filter((b) => !mockSim.downBanks.includes(b));
        if (mockSim.failover && healthy.length > 0) {
            bank = healthy[Math.floor(Math.random() * healthy.length)];
            status = 'REROUTED';
        } else {
            status = 'FAILED';
        }
    }

    mockSim.transactions = [
        {
            id: Date.now(),
            bank,
            amount: Math.floor(Math.random() * 490) + 10,
            status,
            time: new Date().toLocaleTimeString(),
        },
        ...mockSim.transactions,
    ].slice(0, 50);
};

/** Current simulation state. The page polls this once a second. */
export const fetchSimulationState = async (): Promise<SimulationState> => {
    if (!USE_MOCK_SIM) {
        return http<SimulationState>('/api/simulation/state', undefined, SIM_URL);
    }

    mockTick();
    return {
        downBanks: [...mockSim.downBanks],
        failover: mockSim.failover,
        transactions: [...mockSim.transactions],
    };
};

/** Fail (down = true) or recover (down = false) one bank. */
export const setBankFailure = async (bankId: string, down: boolean): Promise<void> => {
    if (!USE_MOCK_SIM) {
        await http(
            down ? '/api/simulation/fail' : '/api/simulation/recover',
            { method: 'POST', body: JSON.stringify({ bankId }) },
            SIM_URL
        );
        return;
    }

    mockSim.downBanks = down
        ? Array.from(new Set([...mockSim.downBanks, bankId]))
        : mockSim.downBanks.filter((b) => b !== bankId);
};

export const setFailoverEnabled = async (enabled: boolean): Promise<void> => {
    if (!USE_MOCK_SIM) {
        await http(
            '/api/simulation/failover',
            { method: 'POST', body: JSON.stringify({ enabled }) },
            SIM_URL
        );
        return;
    }
    mockSim.failover = enabled;
};

export const resetSimulation = async (): Promise<void> => {
    if (!USE_MOCK_SIM) {
        await http('/api/simulation/reset', { method: 'POST' }, SIM_URL);
        return;
    }
    mockSim.downBanks = [];
    mockSim.failover = true;
    mockSim.transactions = [];
};