import type { Metadata, Viewport } from 'next';
import './globals.css';
import { CartProvider } from '@/contexts/CartContext';
import { AudioProvider } from '@/contexts/AudioContext';
import PWARegister from '@/components/PWARegister';
import MiniPlayer from '@/components/audio/MiniPlayer';
import SwipeBackHandler from '@/components/SwipeBackHandler';

export const metadata: Metadata = {
  title: 'Sync World',
  description: 'Music Sync Licensing Portal',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Sync World',
    startupImage: '/apple-touch-icon.png',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1a1a2e',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>
        <CartProvider>
          <AudioProvider>
            <PWARegister />
            <SwipeBackHandler />
            {children}
            <MiniPlayer />
          </AudioProvider>
        </CartProvider>
      </body>
    </html>
  );
}
