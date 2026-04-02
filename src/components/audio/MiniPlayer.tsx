'use client';

import { useRef, useState, useCallback } from 'react';
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
  const [dragging, setDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showVolume, setShowVolume] = useState(false);

  const getFraction = useCallback((clientX: number) => {
    if (!barRef.current) return 0;
    const rect = barRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  function handleBarMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    const frac = getFraction(e.clientX);
    setDragging(true);
    setDragProgress(frac);
    seek(frac);

    const onMove = (ev: MouseEvent) => {
      const f = getFraction(ev.clientX);
      setDragProgress(f);
      seek(f);
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function handleBarTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    const frac = getFraction(e.touches[0].clientX);
    setDragging(true);
    setDragProgress(frac);
    seek(frac);

    const onMove = (ev: TouchEvent) => {
      const f = getFraction(ev.touches[0].clientX);
      setDragProgress(f);
      seek(f);
    };
    const onEnd = () => {
      setDragging(false);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onEnd);
  }

  function handleSkip(seconds: number) {
    if (!duration) return;
    const newFrac = Math.max(0, Math.min(1, (currentTime + seconds) / duration));
    seek(newFrac);
  }

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = parseFloat(e.target.value);
    setVolume(v);
    // Access the audio element through the context is not possible directly,
    // so we use a workaround: find the audio element
    const audios = document.querySelectorAll('audio');
    audios.forEach(a => { a.volume = v; });
  }

  if (!track) return null;

  const displayProgress = dragging ? dragProgress : progress;

  return (
    <div className={`mini-player${expanded ? ' mini-player-expanded' : ''}`}>
      {/* Clickable progress bar with scrubber */}
      <div
        ref={barRef}
        className={`mini-player-bar${dragging ? ' dragging' : ''}`}
        onMouseDown={handleBarMouseDown}
        onTouchStart={handleBarTouchStart}
      >
        <div
          className="mini-player-bar-fill"
          style={{ width: `${displayProgress * 100}%` }}
        />
        <div
          className="mini-player-scrubber"
          style={{ left: `${displayProgress * 100}%` }}
        />
      </div>

      {/* Main content row */}
      <div className="mini-player-content">
        {/* Track info — tap to expand */}
        <div className="mini-player-info" role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && setExpanded(!expanded)} onClick={() => setExpanded(!expanded)}>
          {/* Waveform animation when playing */}
          {playing && (
            <div className="mini-player-wave">
              <span /><span /><span /><span />
            </div>
          )}
          <div>
            <div className="mini-player-title">{track.title}</div>
            <div className="mini-player-artist">{track.artist}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="mini-player-controls">
          <span className="mini-player-time">
            {formatTime(currentTime)}
          </span>

          {/* Skip back 15s */}
          <button
            onClick={() => handleSkip(-15)}
            className="mini-player-skip"
            aria-label="Skip back 15 seconds"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 4v6h6" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            <span className="skip-label">15</span>
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlayPause}
            className="mini-player-play"
            disabled={loading}
          >
            {loading ? (
              <LoadingIcon size={18} color="currentColor" />
            ) : playing ? (
              <PauseIcon size={18} color="currentColor" />
            ) : (
              <PlayIcon size={18} color="currentColor" />
            )}
          </button>

          {/* Skip forward 15s */}
          <button
            onClick={() => handleSkip(15)}
            className="mini-player-skip"
            aria-label="Skip forward 15 seconds"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            <span className="skip-label">15</span>
          </button>

          <span className="mini-player-time">
            {formatTime(duration)}
          </span>

          {/* Volume on desktop */}
          <div className="mini-player-volume-wrap">
            <button
              className="mini-player-vol-btn"
              onClick={() => setShowVolume(!showVolume)}
              aria-label="Volume"
            >
              {volume === 0 ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  {volume > 0.5 && <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />}
                </svg>
              )}
            </button>
            {showVolume && (
              <div className="mini-player-volume-popup">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="mini-player-volume-slider"
                />
              </div>
            )}
          </div>
        </div>

        {/* Close button */}
        <div className="mini-player-close-wrap">
          <button onClick={close} className="mini-player-close" aria-label="Close player">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded view — extra info */}
      {expanded && (
        <div className="mini-player-expanded-info">
          <div className="mini-player-expanded-details">
            {track.genre && <span className="mini-player-tag">{track.genre.split(',')[0]?.trim()}</span>}
            {track.mood && <span className="mini-player-tag">{track.mood}</span>}
            {track.bpm && <span className="mini-player-tag">{track.bpm} BPM</span>}
            {track.key && <span className="mini-player-tag">{track.key}</span>}
            {track.vocal && <span className="mini-player-tag">{track.vocal}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
