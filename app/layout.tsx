import type { Metadata } from 'next';
import AppShell from '@/components/layout/AppShell';
import './globals.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'OmniAgent Studio',
  description: 'Coordinate multiple AI coding tools with a shared context file',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased h-screen flex bg-[#09090b] text-zinc-50 font-sans selection:bg-zinc-800 selection:text-zinc-50">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
