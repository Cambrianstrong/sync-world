'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number; // pixels to pull before triggering (default 80)
}

export default function usePullToRefresh({ onRefresh, threshold = 80 }: UsePullToRefreshOptions) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only activate when scrolled to top
    if (window.scrollY <= 0) {
      startY.current = e.touches[0].clientY;
      isDragging.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current || refreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0 && window.scrollY <= 0) {
      // Apply resistance — pull distance is dampened
      const distance = Math.min(diff * 0.5, threshold * 2);
      setPullDistance(distance);
      setPulling(true);

      if (distance > 10) {
        e.preventDefault();
      }
    }
  }, [refreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    if (pullDistance >= threshold && !refreshing) {
      setRefreshing(true);
      setPullDistance(threshold); // Hold at threshold while refreshing
      try {
        await onRefresh();
      } catch (e) {
        // silently handle
      }
      setRefreshing(false);
    }

    setPulling(false);
    setPullDistance(0);
  }, [pullDistance, threshold, refreshing, onRefresh]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { pulling, pullDistance, refreshing };
}
