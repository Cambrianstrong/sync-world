'use client';

import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import type { Track } from '@/lib/types';

interface AudioState {
  track: Track | null;
  playing: boolean;
  progress: number;   // 0-1
  currentTime: number; // seconds
  duration: number;    // seconds
  loading: boolean;
}

interface AudioContextType extends AudioState {
  play: (track: Track) => Promise<void>;
  pause: () => void;
  resume: () => void;
  togglePlayPause: () => void;
  seek: (fraction: number) => void;
  close: () => void;
}

const AudioContext = createContext<AudioContextType>({
  track: null,
  playing: false,
  progress: 0,
  currentTime: 0,
  duration: 0,
  loading: false,
  play: async () => {},
  pause: () => {},
  resume: () => {},
  togglePlayPause: () => {},
  seek: () => {},
  close: () => {},
});

export function useAudio() {
  return useContext(AudioContext);
}

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AudioState>({
    track: null,
    playing: false,
    progress: 0,
    currentTime: 0,
    duration: 0,
    loading: false,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // Update progress via requestAnimationFrame
  const updateProgress = useCallback(() => {
    const audio = audioRef.current;
    if (audio && !audio.paused) {
      setState(prev => ({
        ...prev,
        currentTime: audio.currentTime,
        duration: audio.duration || 0,
        progress: audio.duration ? audio.currentTime / audio.duration : 0,
      }));
      rafRef.current = requestAnimationFrame(updateProgress);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const play = useCallback(async (track: Track) => {
    // Stop current audio
    if (audioRef.current) {
      audioRef.current.pause();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }

    // If same track, just restart
    if (state.track?.id === track.id && audioRef.current) {
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
      setState(prev => ({ ...prev, playing: true }));
      rafRef.current = requestAnimationFrame(updateProgress);
      return;
    }

    setState({
      track,
      playing: false,
      progress: 0,
      currentTime: 0,
      duration: 0,
      loading: true,
    });

    try {
      const res = await fetch(`/api/play?trackId=${encodeURIComponent(track.id)}`);
      const json = await res.json();

      if (!res.ok || !json.signedUrl) {
        console.error('[AudioContext] Play failed:', json.error || 'No signed URL');
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      const audio = new Audio(json.signedUrl);
      audioRef.current = audio;

      audio.onloadedmetadata = () => {
        setState(prev => ({ ...prev, duration: audio.duration || 0 }));
      };

      audio.onended = () => {
        setState(prev => ({ ...prev, playing: false, progress: 1 }));
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };

      audio.onerror = () => {
        setState(prev => ({ ...prev, playing: false, loading: false }));
      };

      await audio.play();
      setState(prev => ({ ...prev, playing: true, loading: false }));
      rafRef.current = requestAnimationFrame(updateProgress);
    } catch {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [state.track?.id, updateProgress]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setState(prev => ({ ...prev, playing: false }));
    }
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play();
      setState(prev => ({ ...prev, playing: true }));
      rafRef.current = requestAnimationFrame(updateProgress);
    }
  }, [updateProgress]);

  const togglePlayPause = useCallback(() => {
    if (state.playing) {
      pause();
    } else if (state.track) {
      resume();
    }
  }, [state.playing, state.track, pause, resume]);

  const seek = useCallback((fraction: number) => {
    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = fraction * audioRef.current.duration;
      setState(prev => ({
        ...prev,
        currentTime: audioRef.current!.currentTime,
        progress: fraction,
      }));
    }
  }, []);

  const close = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setState({
      track: null,
      playing: false,
      progress: 0,
      currentTime: 0,
      duration: 0,
      loading: false,
    });
  }, []);

  return (
    <AudioContext.Provider value={{
      ...state,
      play,
      pause,
      resume,
      togglePlayPause,
      seek,
      close,
    }}>
      {children}
    </AudioContext.Provider>
  );
}
