'use client';

import { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useAudio } from '@/contexts/AudioContext';
import { PlayIcon, PauseIcon, LoadingIcon } from '@/components/ui/Icons';

export function CartButton() {
  const { count } = useCart();
  const { track: activeTrack } = useAudio();
  const [open, setOpen] = useState(false);

  // Move cart button up when mini player is showing
  const bottomOffset = activeTrack ? 80 : 24;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', bottom: bottomOffset, right: 24, zIndex: 100,
          transition: 'bottom 0.2s ease',
          padding: '0 20px', height: 44, borderRadius: 12,
          border: '1px solid var(--border)',
          background: 'var(--surface-solid)', color: 'var(--text)', fontSize: 12, fontWeight: 700,
          letterSpacing: 0.5, fontFamily: "'DM Sans', sans-serif",
          cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        CART
        {count > 0 && (
          <span style={{
            position: 'absolute', top: -6, right: -6,
            width: 22, height: 22, borderRadius: '50%',
            background: 'var(--green)', color: '#fff', fontSize: 11,
            fontWeight: 700, display: 'flex', alignItems: 'center',
            justifyContent: 'center',
          }}>
            {count}
          </span>
        )}
      </button>
      {open && <CartDrawer onClose={() => setOpen(false)} />}
    </>
  );
}

async function triggerDownload(trackId: string, fileName?: string) {
  try {
    // Step 1: Get signed URL from our API
    const res = await fetch(`/api/download?trackId=${trackId}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `API error ${res.status}`);
    }
    const { signedUrl, fileName: serverName } = await res.json();
    const name = fileName || serverName || 'track.mp3';

    // Step 2: Fetch the actual file from Supabase storage
    const fileRes = await fetch(signedUrl);
    if (!fileRes.ok) throw new Error(`Storage fetch failed: ${fileRes.status}`);
    const blob = await fileRes.blob();

    // Determine correct MIME type from the blob or file extension
    const ext = name.split('.').pop()?.toLowerCase() || 'mp3';
    const mimeTypes: Record<string, string> = {
      mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4',
      aac: 'audio/aac', flac: 'audio/flac', ogg: 'audio/ogg', wma: 'audio/x-ms-wma',
    };
    const mimeType = blob.type && blob.type !== 'application/octet-stream'
      ? blob.type
      : mimeTypes[ext] || 'audio/mpeg';

    // Step 3: Try Web Share API (iOS share sheet with "Save to Files")
    try {
      const file = new File([blob], name, { type: mimeType });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
    } catch (shareErr: any) {
      if (shareErr?.name === 'AbortError') return;
      // Share failed, fall through to blob download
    }

    // Step 4: Fallback — blob URL download (desktop)
    const dlBlob = new Blob([blob], { type: mimeType });
    const url = URL.createObjectURL(dlBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      try { document.body.removeChild(a); } catch {}
    }, 2000);
  } catch (err: any) {
    if (err?.name === 'AbortError') return;
    console.error('[Download]', err);
    alert('Download failed. Please try again.');
  }
}

// Export so downloads page can reuse
export { triggerDownload };

function CartDrawer({ onClose }: { onClose: () => void }) {
  const { items, removeFromCart, clearCart } = useCart();
  const { track: currentTrack, playing, loading: audioLoading, play, pause } = useAudio();
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloaded, setDownloaded] = useState<Record<string, boolean>>({});

  async function handleDownload(trackId: string, title: string, artist: string) {
    setDownloading(prev => ({ ...prev, [trackId]: true }));
    const fileName = `${title} - ${artist}.mp3`;
    await triggerDownload(trackId, fileName);
    setDownloading(prev => ({ ...prev, [trackId]: false }));
    setDownloaded(prev => ({ ...prev, [trackId]: true }));
  }

  async function handleDownloadAll() {
    setDownloadingAll(true);
    for (let i = 0; i < items.length; i++) {
      const t = items[i].track;
      const fileName = `${t.title} - ${t.artist}.mp3`;
      await triggerDownload(t.id, fileName);
      setDownloaded(prev => ({ ...prev, [t.id]: true }));
    }
    setDownloadingAll(false);
  }

  function handlePlay(track: any) {
    if (currentTrack?.id === track.id && playing) {
      pause();
    } else {
      play(track);
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        role="presentation"
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 150,
          background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(4px)',
        }}
      />
      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 440,
        zIndex: 151, background: 'var(--surface-solid)', boxShadow: 'var(--shadow-lg)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700 }}>
              My Selection
            </h2>
            <p style={{ color: 'var(--dim)', fontSize: 13, marginTop: 2 }}>
              {items.length} track{items.length !== 1 ? 's' : ''} selected
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 24, color: 'var(--dim)',
            cursor: 'pointer', lineHeight: 1,
          }}>
            &times;
          </button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--dim)', fontSize: 14 }}>
              No tracks selected yet. Browse the catalog and add tracks to your selection.
            </div>
          ) : (
            items.map(item => {
              const t = item.track;
              const isCurrentTrack = currentTrack?.id === t.id;
              const isPlaying = isCurrentTrack && playing;
              const isDownloading = downloading[t.id];
              const isDownloaded = downloaded[t.id];

              return (
                <div key={t.id} style={{
                  padding: '14px 0', borderBottom: '1px solid var(--border)',
                }}>
                  {/* Track info row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    {/* Play button */}
                    <button
                      onClick={() => handlePlay(t)}
                      disabled={audioLoading && isCurrentTrack}
                      style={{
                        width: 36, height: 36, borderRadius: '50%', border: 'none', flexShrink: 0,
                        background: isPlaying ? 'var(--green)' : '#1a1a2e',
                        color: '#fff', cursor: (audioLoading && isCurrentTrack) ? 'wait' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {(audioLoading && isCurrentTrack) ? <LoadingIcon size={13} color="#fff" /> : isPlaying ? <PauseIcon size={13} color="#fff" /> : <PlayIcon size={13} color="#fff" />}
                    </button>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                      <div style={{ color: 'var(--dim)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.artist} &middot; {t.genre}
                      </div>
                    </div>
                    {/* Remove */}
                    <button onClick={() => removeFromCart(t.id)} style={{
                      background: 'none', border: 'none', color: 'var(--dim)',
                      fontSize: 18, cursor: 'pointer', padding: '4px', lineHeight: 1, flexShrink: 0,
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                  {/* Download button per track */}
                  <button
                    onClick={() => handleDownload(t.id, t.title, t.artist)}
                    disabled={isDownloading}
                    style={{
                      width: '100%', padding: '8px 0', borderRadius: 8,
                      border: isDownloaded ? '1px solid rgba(5,150,105,0.2)' : '1px solid var(--border)',
                      background: isDownloaded ? 'rgba(5,150,105,0.1)' : 'var(--surface)',
                      color: isDownloaded ? 'var(--green)' : 'var(--text)',
                      fontSize: 12, fontWeight: 600, cursor: isDownloading ? 'wait' : 'pointer',
                      fontFamily: "'DM Sans', sans-serif",
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    {isDownloading ? (
                      <>
                        <LoadingIcon size={12} color="currentColor" /> Downloading...
                      </>
                    ) : isDownloaded ? (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Downloaded
                      </>
                    ) : (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Download
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {items.length > 0 && (
            <>
              <button
                onClick={handleDownloadAll}
                disabled={downloadingAll || items.length === 0}
                style={{
                  width: '100%', padding: '12px 24px', borderRadius: 10, border: 'none',
                  background: 'var(--green)', color: '#fff', fontSize: 14, fontWeight: 600,
                  cursor: downloadingAll ? 'wait' : 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: downloadingAll ? 0.7 : 1,
                }}
              >
                {downloadingAll ? (
                  <>
                    <LoadingIcon size={14} color="#fff" /> Downloading All...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download All ({items.length})
                  </>
                )}
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={clearCart} style={{
                  flex: 1, padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)',
                  background: 'var(--surface-solid)', color: 'var(--dim)', fontSize: 13,
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                }}>
                  Clear Cart
                </button>
                <button onClick={onClose} style={{
                  flex: 1, padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)',
                  background: 'var(--surface-solid)', color: 'var(--text)', fontSize: 13,
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                }}>
                  Close
                </button>
              </div>
            </>
          )}
          {items.length === 0 && (
            <button onClick={onClose} style={{
              width: '100%', padding: '12px 24px', borderRadius: 10, border: '1px solid var(--border)',
              background: 'var(--surface-solid)', color: 'var(--text)', fontSize: 14, fontWeight: 500,
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            }}>
              Close
            </button>
          )}
        </div>
      </div>
    </>
  );
}
