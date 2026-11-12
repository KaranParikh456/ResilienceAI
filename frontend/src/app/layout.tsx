// src/app/layout.tsx
import '../styles/global.css';
import type { Metadata, Viewport } from 'next';
import { Libre_Baskerville, Inter } from 'next/font/google';
import Sidebar from '@/app/components/ui/Sidebar';
import CommandPalette from '@/app/components/ui/CommandPalette';

const baskerville = Libre_Baskerville({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-baskerville',
});
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: {
    default: 'ResilienceAI',
    template: '%s · ResilienceAI',
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
    <html lang="en" className={`${baskerville.variable} ${inter.variable}`}>
      <body className="antialiased">
        <div className="flex min-h-screen">
          <aside className="w-64 flex-shrink-0 sticky top-0 h-screen">
            <Sidebar />
          </aside>
          <main className="flex-grow min-w-0 p-10">{children}</main>
        </div>
        <CommandPalette />
      </body>
    </html>
  );
}