import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sameer Bus | Noida ↔ Rampur (UP) Live Seat Booking',
  description:
    'Book AC Seater 2x2 bus seats between Sector 34 Metro Station (Noida) and Shehnai Mandap, Shahbad Gate (Rampur) with instant QR boarding pass.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#D84E55',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-dvh bg-[#F8FAFC] text-[#0F172A] antialiased selection:bg-[#FFF1F2] selection:text-[#B91C1C]">
        {children}
      </body>
    </html>
  );
}
