import type { Metadata } from 'next';
import { Cinzel, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { SceneWrapper } from '@/components/canvas/SceneWrapper';

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'THE AI-ML CLUB // The Impossible Spire — Recruitment 2026',
  description:
    'Interactive Isometric 3D Monument Valley Recruitment Portal for The AI-ML Club (VIT Vellore). Traverse the Spire, illuminate the Courtyard Runes, and align the Summit Astrolabe.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${cinzel.variable} ${jakarta.variable} ${jetbrainsMono.variable} dark`}
    >
      <body className="bg-[#00BFA5] text-white font-sans antialiased overflow-hidden select-none">
        {/* Persistent 3D Isometric WebGL Canvas Shell (Z-Index 0, Fixed) */}
        <SceneWrapper />

        {/* Accessible HTML DOM Foreground Layer (Z-Index 10-50) */}
        <main className="relative z-10 w-full h-full pointer-events-none">
          {children}
        </main>
      </body>
    </html>
  );
}
