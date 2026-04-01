'use client';

import { useState } from 'react';
import type { Track } from '@/lib/types';
import Badge, { statusBadgeVariant, syncBadgeVariant } from '@/components/ui/Badge';
import EnergyBar from '@/components/ui/EnergyBar';
import VersionDots from '@/components/ui/VersionDots';
import { useCart } from '@/contexts/CartContext';


interface TrackTableProps {
  tracks: Track[];
  onView: (track: Track) => void;
  showCart?: boolean;
}

const thStyle: React.CSSProperties = {
  padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--dim)',
  background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border)',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 14px', fontSize: 14,
  borderBottom: '1px solid var(--border)', verticalAlign: 'middle',
};

export default function TrackTable({ tracks, onView, showCart = false }: TrackTableProps) {
  const { addToCart, removeFromCart, isInCart } = useCart();
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [loadingPlay, setLoadingPlay] = useState<string | null>(null);

  async function handlePlay(track: Track) {
    // If already playing this track, pause it
    if (playingTrackId === track.id && audioElement) {
      audioElement.pause();
      setPlayingTrackId(null);
      setAudioElement(null);
      return;
    }

    // Stop any currently playing audio
    if (audioElement) {
      audioElement.pause();
    }

    setLoadingPlay(track.id);

    try {
      const res = await fetch(`/api/play?trackId=${encodeURIComponent(track.id)}`);
      const json = await res.json();

      if (!res.ok || !json.signedUrl) {
        alert(json.error || 'Could not load audio file.');
        setLoadingPlay(null);
        return;
      }

      const audio = new Audio(json.signedUrl);

      audio.onerror = (e) => {
        console.error('[Play] Audio error:', e);
        alert('Audio playback failed. The file may be in an unsupported format.');
        setPlayingTrackId(null);
        setAudioElement(null);
      };

      audio.onended = () => {
        setPlayingTrackId(null);
        setAudioElement(null);
      };

      await audio.play();
      setAudioElement(audio);
      setPlayingTrackId(track.id);
    } catch (err) {
      console.error('[Play] Error:', err);
      alert('Playback error: ' + (err instanceof Error ? err.message : 'unknown'));
    }

    setLoadingPlay(null);
  }

  return (
    <div className="table-scroll">
    <table style={{
      width: '100%', borderCollapse: 'separate', borderSpacing: 0,
      background: 'var(--surface-solid)', borderRadius: 14, border: '1px solid var(--border)',
      overflow: 'hidden', minWidth: 800, boxShadow: 'var(--shadow-sm)',
    }}>
      <thead>
        <tr>
          <th style={thStyle}>Title / Artist</th>
          <th style={thStyle}>Type</th>
          <th style={thStyle}>Status</th>
          <th style={thStyle}>Genre</th>
          <th style={thStyle}>BPM</th>
          <th style={thStyle}>Energy</th>
          <th style={thStyle}>Mood</th>
          <th style={thStyle}>Vocal</th>
          <th style={thStyle}>Versions</th>
          <th style={thStyle}>Sync Status</th>
          <th style={thStyle}>Actions</th>
          {showCart && <th style={{ ...thStyle, textAlign: 'center', width: 60 }}>CART</th>}
        </tr>
      </thead>
      <tbody>
        {tracks.length === 0 ? (
          <tr>
            <td colSpan={11 + (showCart ? 1 : 0)} style={{ ...tdStyle, textAlign: 'center', color: 'var(--dim)', padding: 40 }}>
              No tracks found
            </td>
          </tr>
        ) : (
          tracks.map(track => (
            <tr key={track.id}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.015)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <td style={tdStyle}>
                <div style={{ fontWeight: 600 }}>{track.title}</div>
                <div style={{ color: 'var(--dim)', fontSize: 12 }}>{track.artist}</div>
              </td>
              <td style={tdStyle}>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                  background: track.vocal === 'Instrumental' ? 'rgba(99,102,241,0.1)' : 'rgba(236,72,153,0.1)',
                  color: track.vocal === 'Instrumental' ? '#6366f1' : '#ec4899',
                }}>
                  {track.vocal === 'Instrumental' ? 'Instrumental' : 'Song'}
                </span>
              </td>
              <td style={tdStyle}>
                <Badge variant={statusBadgeVariant(track.status)}>
                  {track.status === 'Unreleased (Complete)' ? 'Unreleased' : track.status}
                </Badge>
              </td>
              <td style={tdStyle}>{track.genre}</td>
              <td style={tdStyle}>{track.bpm || '\u2014'}</td>
              <td style={tdStyle}><EnergyBar level={track.energy} /></td>
              <td style={{ ...tdStyle, fontSize: 13 }}>{track.mood || '\u2014'}</td>
              <td style={tdStyle}>{track.vocal}</td>
              <td style={tdStyle}>
                <VersionDots hasMain={track.has_main} hasClean={track.has_clean}
                  hasInst={track.has_inst} hasAcap={track.has_acap} />
              </td>
              <td style={tdStyle}>
                {track.sync_status !== 'none' ? (
                  <Badge variant={syncBadgeVariant(track.sync_status)}>
                    {track.sync_status.charAt(0).toUpperCase() + track.sync_status.slice(1)}
                  </Badge>
                ) : (
                  <span style={{ color: 'var(--dim)', fontSize: 12 }}>&mdash;</span>
                )}
              </td>
              <td style={tdStyle}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => onView(track)} title="Track Info" style={{
                    padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'var(--surface-solid)', color: 'var(--dim)', fontSize: 14, cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif", boxShadow: 'var(--shadow-sm)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    &#9432;
                  </button>
                  <button
                    onClick={() => handlePlay(track)}
                    title={playingTrackId === track.id ? 'Pause' : 'Play'}
                    disabled={loadingPlay === track.id}
                    style={{
                      padding: '6px 12px', borderRadius: 8, border: 'none',
                      background: playingTrackId === track.id ? 'var(--green)' : 'var(--accent)',
                      color: '#fff', fontSize: 12, cursor: loadingPlay === track.id ? 'wait' : 'pointer',
                      fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      minWidth: 36,
                    }}
                  >
                    {loadingPlay === track.id ? '...' : playingTrackId === track.id ? '\u25AE\u25AE' : '\u25B6'}
                  </button>
                </div>
              </td>
              {showCart && (
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  {isInCart(track.id) ? (
                    <button onClick={() => removeFromCart(track.id)} style={{
                      width: 30, height: 30, borderRadius: 8, border: 'none',
                      background: 'var(--green)', color: '#fff', fontSize: 14,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto',
                    }}>
                      &#10003;
                    </button>
                  ) : (
                    <button onClick={() => addToCart(track)} style={{
                      width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)',
                      background: 'var(--surface-solid)', color: 'var(--dim)', fontSize: 14,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto',
                    }}>
                      +
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))
        )}
      </tbody>
    </table>
    </div>
  );
}
