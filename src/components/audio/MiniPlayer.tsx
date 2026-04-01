'use client';

import { useRef } from 'react';
import { useAudio } from '@/contexts/AudioContext';
import { PlayIcon, PauseIcon, LoadingIcon } from '@/components/ui/Icons';

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MiniPlayer() {
  const { track, playing, progress, currentTime, duration, loading, togglePlayPause, seek, close } = useAudio();
  const barRef = useRef<HTMLDivElement>(null);

  if (!track) return null;

  function handleBarClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seek(fraction);
  }

  return (
    <div className="mini-player">
      {/* Progress bar */}
      <div
        ref={barRef}
        className="mini-player-bar"
        onClick={handleBarClick}
      >
        <div
          className="mini-player-bar-fill"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div className="mini-player-content">
        {/* Track info */}
        <div className="mini-player-info">
          <div className="mini-player-title">{track.title}</div>
          <div className="mini-player-artist">{track.artist}</div>
        </div>

        {/* Controls */}
        <div className="mini-player-controls">
          <span className="mini-player-time">
            {formatTime(currentTime)}
          </span>

          <button
            onClick={togglePlayPause}
            className="mini-player-play"
            disabled={loading}
          >
            {loading ? (
              <LoadingIcon size={16} color="currentColor" />
            ) : playing ? (
              <PauseIcon size={16} color="currentColor" />
            ) : (
              <PlayIcon size={16} color="currentColor" />
            )}
          </button>

          <span className="mini-player-time">
            {formatTime(duration)}
          </span>
        </div>

        {/* Close button */}
        <div className="mini-player-close-wrap">
          <button onClick={close} className="mini-player-close">
            &times;
          </button>
        </div>
      </div>
    </div>
  );
}
