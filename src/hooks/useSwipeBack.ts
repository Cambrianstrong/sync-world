'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function useSwipeBack() {
  const router = useRouter();
  const startX = useRef(0);
  const startY = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only activate from left edge (first 30px)
    if (e.touches[0].clientX < 30) {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      isDragging.current = true;
    }
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = endX - startX.current;
    const diffY = Math.abs(endY - startY.current);

    // Swipe right from left edge: at least 80px horizontal, less vertical than horizontal
    if (diffX > 80 && diffY < diffX) {
      router.back();
    }
  }, [router]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);
}
