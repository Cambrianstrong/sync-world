'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Track } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { useAudio } from '@/contexts/AudioContext';
import { PlayIcon, PauseIcon, LoadingIcon } from '@/components/ui/Icons';

interface TrackDetailProps {
  track: Track | null;
  open: boolean;
  onClose: () => void;
  onInterest?: (trackId: string, level: 'liked' | 'chosen' | 'placed') => void;
  showInterest?: boolean;
}

interface AudioFile {
  version_type: string;
  signedUrl: string;
}

export default function TrackDetail({ track, open, onClose, onInterest, showInterest = true }: TrackDetailProps) {
  const { addToCart, removeFromCart, isInCart } = useCart();
  const { track: currentTrack, playing, loading: audioLoading, play, pause } = useAudio();
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [loadingAudio, setLoadingAudio] = useState(false);

  // Swipe-to-dismiss state
  const [dragY, setDragY] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [swipeDir, setSwipeDir] = useState<'down' | 'right' | null>(null);
  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Lock background scroll when sheet is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [open]);

  useEffect(() => {
    if (track && open) {
      loadAudioFiles(track.id);
      setDragY(0);
      setDragX(0);
    } else {
      setAudioFiles([]);
      setDragY(0);
      setDragX(0);
    }
  }, [track?.id, open]);

  async function loadAudioFiles(trackId: string) {
    setLoadingAudio(true);
    const supabase = createClient();
    const { data: files } = await supabase
      .from('track_files')
      .select('version_type, storage_path')
      .eq('track_id', trackId);

    if (files && files.length > 0) {
      const urls: AudioFile[] = [];
      for (const file of files) {
        const { data } = await supabase.storage
          .from('tracks')
          .createSignedUrl(file.storage_path, 3600);
        if (data?.signedUrl) {
          urls.push({ version_type: file.version_type, signedUrl: data.signedUrl });
        }
      }
      setAudioFiles(urls);
    } else {
      setAudioFiles([]);
    }
    setLoadingAudio(false);
  }

  // Touch handlers for swipe-to-dismiss (down or right)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const el = sheetRef.current;
    startYRef.current = e.touches[0].clientY;
    startXRef.current = e.touches[0].clientX;
    setSwipeDir(null);
    // Only allow swipe-down when scrolled to top; swipe-right always allowed
    if (el && el.scrollTop <= 0) {
      setIsDragging(true);
    } else {
      // Still track for swipe-right
      setIsDragging(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const diffY = e.touches[0].clientY - startYRef.current;
    const diffX = e.touches[0].clientX - startXRef.current;

    // Determine direction on first significant movement
    if (!swipeDir) {
      if (Math.abs(diffY) > 10 || Math.abs(diffX) > 10) {
        const el = sheetRef.current;
        if (diffX > 0 && Math.abs(diffX) > Math.abs(diffY)) {
          setSwipeDir('right');
        } else if (diffY > 0 && el && el.scrollTop <= 0) {
          setSwipeDir('down');
        } else {
          // Scrolling content — cancel drag
          setIsDragging(false);
          return;
        }
      } else {
        return;
      }
    }

    if (swipeDir === 'down' && diffY > 0) {
      e.preventDefault();
      setDragY(diffY);
    } else if (swipeDir === 'right' && diffX > 0) {
      e.preventDefault();
      setDragX(diffX);
    }
  }, [isDragging, swipeDir]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    const dismiss = (swipeDir === 'down' && dragY > 120) || (swipeDir === 'right' && dragX > 100);

    if (dismiss) {
      if (swipeDir === 'down') setDragY(window.innerHeight);
      if (swipeDir === 'right') setDragX(window.innerWidth);
      setTimeout(onClose, 200);
    } else {
      setDragY(0);
      setDragX(0);
    }
    setSwipeDir(null);
  }, [isDragging, dragY, dragX, swipeDir, onClose]);

  if (!track || !open) return null;

  const versions = [
    { label: 'Main', on: track.has_main },
    { label: 'Clean', on: track.has_clean },
    { label: 'Instrumental', on: track.has_inst },
    { label: 'Acapella', on: track.has_acap },
  ];

  const versionLabels: Record<string, string> = {
    main: 'Main', clean: 'Clean', instrumental: 'Instrumental', acapella: 'Acapella',
  };

  const dragTotal = Math.max(dragY, dragX);
  const opacity = Math.max(0, 1 - dragTotal / 400);

  // Detect if desktop (768px+)
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;

  return (
    <div
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0,
        background: `rgba(0,0,0,${0.4 * opacity})`,
        zIndex: 100,
        display: 'flex',
        alignItems: isDesktop ? 'center' : 'flex-end',
        justifyContent: 'center',
        backdropFilter: `blur(${4 * opacity}px)`,
      }}
    >
      <div
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          background: 'var(--surface-solid)',
          border: '1px solid var(--border)',
          borderRadius: isDesktop ? 20 : '20px 20px 0 0',
          padding: '12px 24px 32px',
          width: '100%',
          maxWidth: 680,
          maxHeight: isDesktop ? '85vh' : '90vh',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          touchAction: swipeDir ? 'none' : 'pan-y',
          boxShadow: 'var(--shadow-lg)',
          transform: `translate(${dragX}px, ${dragY}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease',
        }}
      >
        {/* Drag handle */}
        <div style={{
          display: 'flex', justifyContent: 'center', paddingBottom: 16, cursor: 'grab',
        }}>
          <div style={{
            width: 40, height: 5, borderRadius: 3,
            background: 'var(--dim)', opacity: 0.4,
          }} />
        </div>

        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22 }}>{track.title}</h2>
        <p style={{ color: 'var(--dim)', fontSize: 14, marginBottom: 24 }}>
          {track.artist}{track.producers ? ` \u00b7 Prod. ${track.producers}` : ''}
        </p>

        {(audioFiles.length > 0 || loadingAudio) && (
          <div style={{
            marginBottom: 20, padding: 16, background: 'rgba(0,0,0,0.02)', borderRadius: 12,
            border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--dim)', marginBottom: 10, fontWeight: 500 }}>
              Listen
            </div>
            {loadingAudio ? (
              <div style={{ fontSize: 13, color: 'var(--dim)', padding: '8px 0' }}>Loading audio...</div>
            ) : (
              audioFiles.map((af, i) => {
                const isMain = af.version_type === 'main';
                const isCurrentTrack = currentTrack?.id === track?.id;
                return (
                  <div key={i} style={{ marginBottom: i < audioFiles.length - 1 ? 10 : 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                      {versionLabels[af.version_type] || af.version_type}
                    </div>
                    {isMain && track ? (
                      <button
                        onClick={() => {
                          if (isCurrentTrack && playing) { pause(); }
                          else { play(track); }
                        }}
                        disabled={audioLoading && isCurrentTrack}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          width: '100%', padding: '10px 16px', borderRadius: 10,
                          border: '1px solid var(--border)',
                          background: isCurrentTrack && playing ? 'rgba(5,150,105,0.06)' : 'var(--surface-solid)',
                          color: isCurrentTrack && playing ? 'var(--green)' : 'var(--text)',
                          fontSize: 13, fontWeight: 500, cursor: (audioLoading && isCurrentTrack) ? 'wait' : 'pointer',
                          fontFamily: "'DM Sans', sans-serif", boxShadow: 'var(--shadow-sm)',
                        }}
                      >
                        <span style={{
                          width: 32, height: 32, borderRadius: '50%', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          background: isCurrentTrack && playing ? 'var(--green)' : 'var(--accent)',
                          color: '#fff', fontSize: 13,
                        }}>
                          {(audioLoading && isCurrentTrack) ? <LoadingIcon size={13} color="#fff" /> : (isCurrentTrack && playing) ? <PauseIcon size={13} color="#fff" /> : <PlayIcon size={13} color="#fff" />}
                        </span>
                        {(audioLoading && isCurrentTrack) ? 'Loading...' : (isCurrentTrack && playing) ? 'Playing \u2014 Main Version' : 'Play Main Version'}
                      </button>
                    ) : (
                      <audio controls preload="none" style={{ width: '100%', height: 36 }}>
                        <source src={af.signedUrl} />
                      </audio>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {audioFiles.length === 0 && !loadingAudio && (
          <div style={{
            marginBottom: 20, padding: 14, background: 'rgba(0,0,0,0.02)', borderRadius: 12,
            border: '1px solid var(--border)', fontSize: 13, color: 'var(--dim)',
          }}>
            No audio preview available for this track.
          </div>
        )}

        <div className="detail-grid" style={{ marginBottom: 20 }}>
          {[
            ['Status', track.status],
            ['Genre', track.genre + (track.subgenre ? ` / ${track.subgenre}` : '')],
            ['BPM', track.bpm || '\u2014'],
            ['Key', track.key || '\u2014'],
            ['Energy', track.energy],
            ['Vocal Type', track.vocal],
            ['Mood', track.mood || '\u2014'],
            ['Theme', track.theme || '\u2014'],
            ['Writers', track.writers || '\u2014'],
            ['Publisher', track.publisher || '\u2014'],
            ['Label', track.label || 'Independent'],
            ['Splits', track.splits || 'TBD'],
            ['Seasonal', track.seasonal || '\u2014'],
          ].map(([label, value]) => (
            <div key={label as string}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--dim)', marginBottom: 3, fontWeight: 500 }}>
                {label}
              </div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--dim)', marginBottom: 6, fontWeight: 500 }}>
            Available Versions
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {versions.map(v => (
              <span key={v.label} style={{
                padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                background: v.on ? 'rgba(5,150,105,0.08)' : 'rgba(0,0,0,0.03)',
                color: v.on ? 'var(--green)' : 'var(--dim)',
                border: `1px solid ${v.on ? 'rgba(5,150,105,0.15)' : 'var(--border)'}`,
              }}>
                {v.label}
              </span>
            ))}
          </div>
        </div>

        {track.notes && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--dim)', marginBottom: 4, fontWeight: 500 }}>
              Notes / Sync Target
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.5 }}>{track.notes}</p>
          </div>
        )}

        {track.lyrics && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--dim)', marginBottom: 4, fontWeight: 500 }}>
              Lyrics
            </div>
            <pre style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--dim)' }}>
              {track.lyrics}
            </pre>
          </div>
        )}

        <div style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 16 }}>
          Sync Status: <strong>{track.sync_status === 'none' ? 'No activity yet' : track.sync_status.charAt(0).toUpperCase() + track.sync_status.slice(1)}</strong>
        </div>

        {showInterest && onInterest && (
          <div style={{
            background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 20, textAlign: 'center', marginTop: 16,
          }}>
            <h3 style={{ fontSize: 15, marginBottom: 6 }}>Interested in this track?</h3>
            <p style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 14 }}>
              Let the RFLCT team know your interest level.
            </p>
            <div className="interest-buttons">
              <button onClick={() => onInterest(track.id, 'liked')} style={{
                padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--surface-solid)', color: 'var(--text)', fontSize: 12, cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif", fontWeight: 500, boxShadow: 'var(--shadow-sm)',
              }}>
                I Like This
              </button>
              <button onClick={() => onInterest(track.id, 'chosen')} style={{
                padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--surface-solid)', color: 'var(--text)', fontSize: 12, cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif", fontWeight: 500, boxShadow: 'var(--shadow-sm)',
              }}>
                I Want to Use This
              </button>
              <button onClick={() => onInterest(track.id, 'placed')} style={{
                padding: '8px 18px', borderRadius: 8, border: 'none',
                background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
              }}>
                Confirm Placement
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          {isInCart(track.id) ? (
            <button onClick={() => removeFromCart(track.id)} style={{
              padding: '10px 20px', borderRadius: 10, border: '1px solid var(--green)',
              background: 'rgba(5,150,105,0.08)', color: 'var(--green)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}>
              &#10003; In Cart
            </button>
          ) : (
            <button onClick={() => addToCart(track)} style={{
              padding: '10px 20px', borderRadius: 10, border: 'none',
              background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}>
              + Add to Cart
            </button>
          )}
          <button onClick={onClose} style={{
            padding: '10px 20px', borderRadius: 10, border: '1px solid var(--border)',
            background: 'var(--surface-solid)', color: 'var(--text)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif", boxShadow: 'var(--shadow-sm)',
          }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
