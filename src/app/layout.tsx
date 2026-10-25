import type { Metadata, Viewport } from 'next';
import './globals.css';
import SeasonalCanvas from '@/components/effects/SeasonalCanvas';

export const metadata: Metadata = {
  title: 'Cluster — Scan. Discover. Connect. | Realtime Team Formation',
  description:
    'Mobile-first, QR-based team formation platform for college orientations, workshops, events, and icebreakers.',
  keywords: ['team formation', 'qr code', 'icebreakers', 'orientation', 'interactive events'],
  authors: [{ name: 'Cluster Team' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#090d16',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090d16] text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        <SeasonalCanvas />
        <div className="relative z-10 min-h-screen flex flex-col">{children}</div>
      </body>
    </html>
  );
}
