'use client';

import { useState, useEffect } from 'react';
import type { Track } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import Modal from '@/components/ui/Modal';
import { useCart } from '@/contexts/CartContext';

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
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [loadingAudio, setLoadingAudio] = useState(false);

  useEffect(() => {
    if (track && open) {
      loadAudioFiles(track.id);
    } else {
      setAudioFiles([]);
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

  if (!track) return null;

  const versions = [
    { label: 'Main', on: track.has_main },
    { label: 'Clean', on: track.has_clean },
    { label: 'Instrumental', on: track.has_inst },
    { label: 'Acapella', on: track.has_acap },
  ];

  const versionLabels: Record<string, string> = {
    main: 'Main', clean: 'Clean', instrumental: 'Instrumental', acapella: 'Acapella',
  };

  return (
    <Modal open={open} onClose={onClose}>
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
            audioFiles.map((af, i) => (
              <div key={i} style={{ marginBottom: i < audioFiles.length - 1 ? 10 : 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                  {versionLabels[af.version_type] || af.version_type}
                </div>
                <audio controls preload="none" style={{ width: '100%', height: 36 }}>
                  <source src={af.signedUrl} />
                </audio>
              </div>
            ))
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
            Let the Sync World team know your interest level.
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
    </Modal>
  );
}
