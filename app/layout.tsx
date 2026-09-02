import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://prism.alx21.chatgpt.site'),
  title: 'Prism — Purpose-aware WebMCP evaluation',
  description:
    'Evaluate a WebMCP implementation against the job it is actually designed to do.',
  openGraph: {
    title: 'Prism',
    description: 'Purpose-aware WebMCP evaluation for declared journeys, safety boundaries, and visible evidence.',
    images: [{ url: '/og.png', width: 1732, height: 908, alt: 'Prism — Purpose-aware WebMCP evaluation' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prism',
    description: 'Purpose-aware WebMCP evaluation for declared journeys, safety boundaries, and visible evidence.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

