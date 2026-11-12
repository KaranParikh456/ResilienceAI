// src/app/security/page.tsx
'use client';

import { useState } from 'react';
import { scanRepository } from '@/lib/api';
import { Vulnerability, Severity } from '@/lib/types';
import { VulnerabilityTable } from '@/app/components/widgets/VulnerabilityTable';
import PageHeader from '@/app/components/ui/PageHeader';

const severities: { sev: Severity; line: string }[] = [
    { sev: 'CRITICAL', line: 'bg-bad' },
    { sev: 'HIGH', line: 'bg-warn' },
    { sev: 'MEDIUM', line: 'bg-brass' },
    { sev: 'LOW', line: 'bg-info' },
];

export default function SecurityPage() {
    const [repoUrl, setRepoUrl] = useState('');
    const [results, setResults] = useState<Vulnerability[] | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleScan = async () => {
        if (!repoUrl.trim()) return;
        setIsScanning(true);
        setResults(null);
        setError(null);
        try {
            setResults(await scanRepository(repoUrl));
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <PageHeader
                index="02"
                eyebrow="Security"
                title="Security Intelligence"
                subtitle="Submit a repository to inspect every dependency for known vulnerabilities."
            />

            <div className="bg-paper border border-line rounded-md p-5 shadow-sm flex flex-col sm:flex-row gap-3">
                <input
                    type="text"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                    placeholder="https://github.com/owner/repo"
                    className="flex-1 bg-ivory border border-line rounded px-4 py-2.5 text-navy placeholder:text-navy-soft/60 focus:outline-none focus:ring-2 focus:ring-brass"
                />
                <button
                    onClick={handleScan}
                    disabled={isScanning || !repoUrl.trim()}
                    className="px-6 py-2.5 bg-navy text-paper rounded font-medium tracking-wide hover:bg-brass transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {isScanning ? 'Scanning...' : 'Start Scan'}
                </button>
            </div>

            {!results && !isScanning && !error && (
                <div className="text-center py-16 border border-dashed border-line rounded-md">
                    <p className="text-4xl mb-3 grayscale opacity-70">🛡️</p>
                    <p className="font-display text-xl text-navy">No scan yet</p>
                    <p className="text-sm text-navy-soft mt-1">Paste a GitHub link above to begin.</p>
                </div>
            )}

            {isScanning && (
                <div className="text-center py-16">
                    <div className="mx-auto h-10 w-10 rounded-full border-4 border-sand border-t-brass animate-spin" />
                    <p className="font-display text-lg text-navy mt-4">Running Trivy and OSV-Scanner</p>
                    <p className="text-sm text-navy-soft">This takes a moment.</p>
                </div>
            )}

            {error && (
                <div className="text-center py-12 bg-paper border border-line rounded-md shadow-sm">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-bad">Scan failed</p>
                    <p className="font-display text-xl text-navy mt-2">We couldn&apos;t complete the scan</p>
                    <p className="text-sm text-navy-soft mt-2">{error}</p>
                </div>
            )}

            {results && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {severities.map(({ sev, line }) => (
                            <div key={sev} className="relative bg-paper border border-line rounded-md p-4 shadow-sm overflow-hidden">
                                <div className={`absolute top-0 left-0 right-0 h-1 ${line}`} />
                                <p className="text-[11px] uppercase tracking-[0.2em] text-navy-soft">{sev}</p>
                                <p className="font-display text-4xl font-bold text-navy mt-2">
                                    {results.filter((v) => v.severity === sev).length}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="bg-paper border border-line rounded-md p-5 shadow-sm">
                        <VulnerabilityTable data={results} />
                    </div>
                </>
            )}
        </div>
    );
}