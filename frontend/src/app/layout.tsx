// src/app/layout.tsx
import '../styles/global.css';
import type { Metadata, Viewport } from 'next';
import EvidenceNotice from '@/app/components/ui/EvidenceNotice';
import Sidebar from '@/app/components/ui/Sidebar';
import CommandPalette from '@/app/components/ui/CommandPalette';

export const metadata: Metadata = {
  title: {
    default: 'ResilienceAI',
    template: '%s Â· ResilienceAI',
  },
  description: 'Security intelligence and infrastructure resilience dashboard',
};

export const viewport: Viewport = {
  themeColor: '#1c2a3f',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="flex min-h-screen">
          <aside className="w-64 flex-shrink-0 sticky top-0 h-screen">
            <Sidebar />
          </aside>
          <main className="flex-grow min-w-0 p-10"><EvidenceNotice />{children}</main>
        </div>
        <CommandPalette />
      </body>
    </html>
  );
}