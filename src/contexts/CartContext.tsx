'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Track } from '@/lib/types';

interface CartItem {
  track: Track;
  addedAt: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (track: Track) => void;
  removeFromCart: (trackId: string) => void;
  isInCart: (trackId: string) => boolean;
  clearCart: () => void;
  count: number;
}

const CartContext = createContext<CartContextType>({
  items: [],
  addToCart: () => {},
  removeFromCart: () => {},
  isInCart: () => false,
  clearCart: () => {},
  count: 0,
});

export function useCart() {
  return useContext(CartContext);
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sw-cart');
      if (saved) setItems(JSON.parse(saved));
    } catch {}
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('sw-cart', JSON.stringify(items));
  }, [items]);

  const addToCart = useCallback((track: Track) => {
    setItems(prev => {
      if (prev.some(i => i.track.id === track.id)) return prev;
      return [...prev, { track, addedAt: Date.now() }];
    });
  }, []);

  const removeFromCart = useCallback((trackId: string) => {
    setItems(prev => prev.filter(i => i.track.id !== trackId));
  }, []);

  const isInCart = useCallback((trackId: string) => {
    return items.some(i => i.track.id === trackId);
  }, [items]);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, isInCart, clearCart, count: items.length }}>
      {children}
    </CartContext.Provider>
  );
}
