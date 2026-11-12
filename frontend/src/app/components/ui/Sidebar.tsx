// src/app/components/ui/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Overview', no: '01' },
  { href: '/security', label: 'Security Intelligence', no: '02' },
  { href: '/map', label: 'Infrastructure Map', no: '03' },
  { href: '/simulator', label: 'Resilience Simulator', no: '04' },
  { href: '/ai-risk', label: 'AI Risk Analysis', no: '05' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="relative h-full bg-navy text-ivory flex flex-col px-6 py-8 overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-brass/20 blur-3xl" />

      <div className="relative pb-6 border-b border-brass/30 flex items-center gap-3">
        <div className="h-10 w-10 border border-brass flex items-center justify-center font-display text-lg text-brass">
          R
        </div>
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-brass">Risk & Resilience</p>
          <h2 className="font-display text-xl font-bold leading-tight text-white">ResilienceAI</h2>
        </div>
      </div>

      <button
        onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
        className="relative mt-6 flex items-center gap-2 px-3 py-2 text-sm text-ivory/60 border border-white/15 rounded hover:border-brass hover:text-white transition"
      >
        <span>⌕</span>
        <span>Search</span>
        <kbd className="ml-auto text-[10px] border border-white/20 rounded px-1.5 py-0.5">Ctrl K</kbd>
      </button>

      <ul className="relative flex flex-col gap-1 mt-6 flex-1">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`group relative flex items-center gap-4 px-4 py-3 text-sm transition-colors duration-300 ${
                  active ? 'bg-white/10 text-white' : 'text-ivory/65 hover:text-white hover:bg-white/5'
                }`}
              >
                <span
                  className={`absolute left-0 top-0 h-full w-0.5 bg-brass origin-top transition-transform duration-300 ${
                    active ? 'scale-y-100' : 'scale-y-0 group-hover:scale-y-50'
                  }`}
                />
                <span className="text-xs text-brass tabular-nums">{link.no}</span>
                <span className="transition-transform duration-300 group-hover:translate-x-1">{link.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="relative pt-6 border-t border-white/10 flex items-center gap-2 text-[11px] text-ivory/50 tracking-wide">
        <span className="pulse-dot" />
        Simulated environment
      </div>
    </nav>
  );
}