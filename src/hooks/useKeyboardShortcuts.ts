'use client';

import { useEffect, useCallback } from 'react';
import { useAudio } from '@/contexts/AudioContext';

interface ShortcutOptions {
  trackCount: number;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onOpenTrack: () => void;
  onCloseModal: () => void;
  onFocusSearch: () => void;
}

export default function useKeyboardShortcuts({
  trackCount,
  selectedIndex,
  onSelectIndex,
  onOpenTrack,
  onCloseModal,
  onFocusSearch,
}: ShortcutOptions) {
  const { togglePlayPause, track: currentTrack } = useAudio();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

    // Cmd/Ctrl + K: focus search (works even in inputs)
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      onFocusSearch();
      return;
    }

    // Escape: close modal (works everywhere)
    if (e.key === 'Escape') {
      onCloseModal();
      return;
    }

    // Don't handle other shortcuts when focused on an input
    if (isInput) return;

    // Space: play/pause
    if (e.key === ' ' && currentTrack) {
      e.preventDefault();
      togglePlayPause();
      return;
    }

    // Arrow Down: next track
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (trackCount > 0) {
        onSelectIndex(Math.min(selectedIndex + 1, trackCount - 1));
      }
      return;
    }

    // Arrow Up: previous track
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (trackCount > 0) {
        onSelectIndex(Math.max(selectedIndex - 1, 0));
      }
      return;
    }

    // Enter: open selected track
    if (e.key === 'Enter') {
      if (selectedIndex >= 0) {
        onOpenTrack();
      }
      return;
    }
  }, [trackCount, selectedIndex, onSelectIndex, onOpenTrack, onCloseModal, onFocusSearch, togglePlayPause, currentTrack]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
