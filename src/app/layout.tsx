import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  applicationName: 'Sameer Bus',
  title: 'Sameer Bus | Noida ↔ Rampur (UP) Seat Booking',
  description:
    'Book AC Seater 2x2 bus seats between Sector 34 Metro Station (Noida) and Shehnai Mandap, Shahbad Gate (Rampur) with instant QR boarding pass.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Sameer Bus',
  },
  icons: {
    icon: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#D84E55',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={plusJakarta.variable}>
      <body className="min-h-dvh bg-[#F8FAFC] font-sans text-[#0F172A] antialiased selection:bg-[#FFF1F2] selection:text-[#B91C1C]">
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
