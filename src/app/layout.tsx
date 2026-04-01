import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/contexts/CartContext';

export const metadata: Metadata = {
  title: 'Sync World',
  description: 'Music sync licensing portal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
