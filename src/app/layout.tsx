import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { ScrollToTop } from '@/components/common/ScrollToTop';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  metadataBase: new URL('https://alvin-swalayan.vercel.app'),
  title: 'Alvin Swalayan - Hemat & Berkualitas | Grocery Delivery Banda Aceh',
  description:
    'Belanja kebutuhan harian keluarga di Alvin Swalayan Banda Aceh. Sembako, minyak goreng, beras, kopi Aceh, dan kebutuhan rumah tangga lengkap dengan layanan antar ke rumah.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.png',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: 'https://alvin-swalayan.vercel.app',
    siteName: 'Alvin Swalayan Banda Aceh',
    title: 'Alvin Swalayan - Hemat & Berkualitas | Grocery Delivery Banda Aceh',
    description:
      'Belanja kebutuhan harian keluarga di Alvin Swalayan Banda Aceh. Sembako, minyak goreng, beras, kopi Aceh, dan kebutuhan rumah tangga lengkap dengan layanan antar ke rumah.',
    images: [
      {
        url: '/og-image.png?v=2',
        width: 512,
        height: 512,
        alt: 'Alvin Swalayan Banda Aceh - Hemat & Berkualitas',
        type: 'image/png',
      },
      {
        url: '/icon-512.png?v=2',
        width: 512,
        height: 512,
        alt: 'Alvin Swalayan Logo',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Alvin Swalayan - Hemat & Berkualitas | Grocery Delivery Banda Aceh',
    description:
      'Belanja kebutuhan harian keluarga di Alvin Swalayan Banda Aceh. Layanan antar sembako cepat.',
    images: ['/og-image.png?v=2'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.png" type="image/png" sizes="512x512" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <meta property="og:image" content="https://alvin-swalayan.vercel.app/og-image.png?v=2" />
        <meta property="og:image:secure_url" content="https://alvin-swalayan.vercel.app/og-image.png?v=2" />
        <meta property="og:image:width" content="512" />
        <meta property="og:image:height" content="512" />
        <meta property="og:image:type" content="image/png" />
      </head>
      <body className="min-h-screen flex flex-col bg-white text-[#222222] antialiased">
        <AuthProvider>
          <CartProvider>
            <Navbar />
            <main className="flex-1 pb-16 md:pb-0">{children}</main>
            <Footer />
            <MobileBottomNav />
            <ScrollToTop />
            <Analytics />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
