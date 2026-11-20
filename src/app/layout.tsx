import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VayuGuide · Urban Air Quality Assistant',
  description:
    'Live pan-India air quality telemetry paired with personalized, low-emission daily routines and indoor air hacks.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas font-sans text-ink antialiased selection:bg-forest/15 selection:text-ink">
        {children}
      </body>
    </html>
  );
}
