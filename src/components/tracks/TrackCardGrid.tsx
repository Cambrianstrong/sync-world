'use client';

import type { Track } from '@/lib/types';
import { useCart } from '@/contexts/CartContext';
import { useAudio } from '@/contexts/AudioContext';
import { PlayIcon, PauseIcon, LoadingIcon } from '@/components/ui/Icons';

interface TrackCardGridProps {
  tracks: Track[];
  onView: (track: Track) => void;
  showCart?: boolean;
}

// Generate a consistent gradient from the genre
function genreGradient(genre: string, index: number): string {
  const gradients = [
    'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    'linear-gradient(135deg, #2d1b69 0%, #11998e 100%)',
    'linear-gradient(135deg, #141e30 0%, #243b55 100%)',
    'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
    'linear-gradient(135deg, #1f1c2c 0%, #928dab 100%)',
    'linear-gradient(135deg, #0c0c1d 0%, #3a1c71 50%, #d76d77 100%)',
    'linear-gradient(135deg, #200122 0%, #6f0000 100%)',
    'linear-gradient(135deg, #1a2a6c 0%, #b21f1f 50%, #fdbb2d 100%)',
    'linear-gradient(135deg, #0d0d0d 0%, #434343 100%)',
    'linear-gradient(135deg, #093028 0%, #237a57 100%)',
    'linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%)',
    'linear-gradient(135deg, #1e130c 0%, #9a8478 100%)',
  ];
  return gradients[index % gradients.length];
}

export default function TrackCardGrid({ tracks, onView, showCart = false }: TrackCardGridProps) {
  const { addToCart, removeFromCart, isInCart } = useCart();
  const { track: currentTrack, playing, loading: audioLoading, play, pause } = useAudio();

  async function handlePlay(e: React.MouseEvent, track: Track) {
    e.stopPropagation();
    if (currentTrack?.id === track.id && playing) {
      pause();
      return;
    }
    await play(track);
  }

  function handleCart(e: React.MouseEvent, track: Track) {
    e.stopPropagation();
    if (isInCart(track.id)) {
      removeFromCart(track.id);
    } else {
      addToCart(track);
    }
  }

  if (tracks.length === 0) {
    return (
      <div style={{
        textAlign: 'center', color: 'var(--dim)', fontSize: 14,
        padding: 60, background: 'var(--surface-solid)', borderRadius: 16,
        border: '1px solid var(--border)',
      }}>
        No tracks found
      </div>
    );
  }

  return (
    <div className="track-card-grid">
      {tracks.map((track, i) => {
        const isPlaying = currentTrack?.id === track.id && playing;
        const isLoading = audioLoading && currentTrack?.id === track.id;
        const inCart = isInCart(track.id);

        return (
          <div
            key={track.id}
            className="track-card"
            role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onView(track)}
            onClick={() => onView(track)}
            style={{
              background: genreGradient(track.genre || '', i),
              borderColor: isPlaying ? 'var(--green)' : undefined,
              boxShadow: isPlaying ? '0 0 20px rgba(5,150,105,0.25)' : undefined,
              justifyContent: 'space-between',
            }}
          >
            {/* Top row: type badge + cart button */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                  textTransform: 'uppercase', letterSpacing: 0.5,
                  background: 'rgba(255,255,255,0.15)', color: '#fff',
                }}>
                  {track.vocal === 'Instrumental' ? 'INST' : 'SONG'}
                </span>
                {isPlaying && (
                  <span style={{
                    fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                    background: 'var(--green)', color: '#fff',
                  }}>
                    NOW PLAYING
                  </span>
                )}
              </div>
              {showCart && (
                <button
                  onClick={(e) => handleCart(e, track)}
                  style={{
                    width: 30, height: 24, borderRadius: 6, border: 'none',
                    background: inCart ? 'var(--green)' : 'rgba(255,255,255,0.25)',
                    color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(8px)', flexShrink: 0,
                    boxShadow: inCart ? '0 2px 8px rgba(5,150,105,0.4)' : '0 2px 8px rgba(0,0,0,0.2)',
                  }}
                >
                  {inCart ? '\u2713' : '+'}
                </button>
              )}
            </div>

            {/* Bottom content */}
            <div style={{ zIndex: 1 }}>
              {/* Title */}
              <div style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700, fontSize: 15, color: '#fff',
                textShadow: '0 1px 4px rgba(0,0,0,0.4)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                lineHeight: 1.2,
              }}>
                {track.title}
              </div>
              {/* Artist */}
              <div style={{
                fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 500,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                marginTop: 2,
              }}>
                {track.artist}
              </div>
              {/* Genre + mood tags */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 }}>
                <span style={{
                  fontSize: 9, padding: '2px 6px', borderRadius: 4,
                  background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)', fontWeight: 500,
                }}>
                  {track.genre?.split(',')[0]?.trim() || 'Other'}
                </span>
                {track.mood && (
                  <span style={{
                    fontSize: 9, padding: '2px 6px', borderRadius: 4,
                    background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)', fontWeight: 500,
                  }}>
                    {track.mood}
                  </span>
                )}
                {track.publisher && (
                  <span style={{
                    fontSize: 9, padding: '2px 6px', borderRadius: 4,
                    background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)', fontWeight: 500,
                  }}>
                    {track.publisher}
                  </span>
                )}
              </div>
              {/* Play button */}
              <button
                onClick={(e) => handlePlay(e, track)}
                disabled={!!isLoading}
                style={{
                  marginTop: 6, width: '100%', padding: '6px 0', borderRadius: 8, border: 'none',
                  background: isPlaying ? 'var(--green)' : 'rgba(255,255,255,0.2)',
                  color: '#fff', fontSize: 11, fontWeight: 600,
                  cursor: isLoading ? 'wait' : 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  backdropFilter: 'blur(8px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                }}
              >
                {isLoading ? <LoadingIcon size={12} color="#fff" /> : isPlaying ? <><PauseIcon size={12} color="#fff" /> Pause</> : <><PlayIcon size={12} color="#fff" /> Play</>}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
