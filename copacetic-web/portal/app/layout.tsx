import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const serif = localFont({
  src: [
    { path: './fonts/cormorant-garamond.woff2', style: 'normal', weight: '300 700' },
    { path: './fonts/cormorant-garamond-italic.woff2', style: 'italic', weight: '300 700' },
  ],
  variable: '--font-serif',
  display: 'swap',
});
const sans = localFont({ src: './fonts/dm-sans.woff2', weight: '100 1000', variable: '--font-sans', display: 'swap' });
const mono = localFont({ src: './fonts/dm-mono.woff2', weight: '400', variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Client portal · copacetic.web', template: '%s · copacetic.web portal' },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
