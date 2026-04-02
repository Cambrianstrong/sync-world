'use client';

import { useState, useEffect, useMemo } from 'react';
import TopNav from '@/components/nav/TopNav';
import Notification, { useNotification } from '@/components/ui/Notification';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/contexts/CartContext';
import { useAudio } from '@/contexts/AudioContext';
import { PlayIcon, PauseIcon, LoadingIcon } from '@/components/ui/Icons';

interface DownloadItem {
  id: string;
  track_id: string | null;
  downloaded_at: string;
  track: {
    id: string;
    title: string;
    artist: string;
    writers: string | null;
    producers: string | null;
    publisher: string | null;
    genre: string;
    subgenre: string | null;
    bpm: number | null;
    energy: string;
    mood: string | null;
    vocal: string;
    key: string | null;
  } | null;
}

export default function DownloadsPage() {
  const { profile, loading: authLoading } = useAuth();
  const { items: cartItems, removeFromCart, clearCart } = useCart();
  const { track: currentTrack, playing, loading: audioLoading, play, pause } = useAudio();
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendEmail, setSendEmail] = useState('');
  const { notif, notify } = useNotification();

  // Pre-fill email from profile
  useEffect(() => {
    if (profile?.email && !sendEmail) {
      setSendEmail(profile.email);
    }
  }, [profile?.email]);

  useEffect(() => {
    loadDownloads();
  }, []);

  async function loadDownloads() {
    try {
      const res = await fetch('/api/downloads');
      const json = await res.json();
      if (json.downloads) setDownloads(json.downloads);
    } catch (err) {
      console.error('Failed to load downloads:', err);
    }
    setLoading(false);
  }

  // Deduplicate: show each track only once, with the most recent download date
  const uniqueDownloads = useMemo(() => {
    const seen = new Map<string, DownloadItem>();
    downloads.forEach(d => {
      if (d.track_id && !seen.has(d.track_id)) {
        seen.set(d.track_id, d);
      }
    });
    return [...seen.values()];
  }, [downloads]);

  async function handleSendToEmail() {
    if (cartItems.length === 0) return;
    if (!sendEmail || !sendEmail.includes('@')) {
      notify('Please enter a valid email address.', 'error');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sendToEmail: sendEmail,
          tracks: cartItems.map(item => ({
            id: item.track.id,
            title: item.track.title,
            artist: item.track.artist,
            genre: item.track.genre,
            bpm: item.track.bpm,
            energy: item.track.energy,
            mood: item.track.mood,
            vocal: item.track.vocal,
            writers: item.track.writers,
            producers: item.track.producers,
            key: item.track.key,
            status: item.track.status,
            download_count: item.track.download_count,
          })),
        }),
      });
      const json = await res.json();
      if (json.success) {
        notify(
          json.emailSent
            ? `${cartItems.length} track${cartItems.length !== 1 ? 's' : ''} sent to ${sendEmail}! Check inbox for secure download links.`
            : `${cartItems.length} track${cartItems.length !== 1 ? 's' : ''} processed. Email service unavailable — contact admin for links.`,
          json.emailSent ? 'success' : 'info',
        );
        clearCart();
        // Reload download history
        await loadDownloads();
      } else {
        notify(json.error || 'Failed to send. Try again.', 'error');
      }
    } catch {
      notify('Failed to send. Try again.', 'error');
    }
    setSending(false);
  }

  async function handleDirectDownload(trackId: string, title?: string, artist?: string) {
    const fileName = title && artist ? `${title} - ${artist}.mp3` : undefined;
    const { triggerDownload } = await import('@/components/cart/CartPanel');
    await triggerDownload(trackId, fileName);
    setTimeout(() => loadDownloads(), 2000);
  }

  async function handleDownloadAll() {
    if (cartItems.length === 0) return;
    setSending(true);
    const { triggerDownload } = await import('@/components/cart/CartPanel');
    for (const item of cartItems) {
      const t = item.track;
      await triggerDownload(t.id, `${t.title} - ${t.artist}.mp3`);
    }
    notify(`${cartItems.length} track${cartItems.length !== 1 ? 's' : ''} downloaded!`, 'success');
    clearCart();
    setTimeout(() => loadDownloads(), 3000);
    setSending(false);
  }

  async function handlePlay(track: any) {
    if (currentTrack?.id === track.id && playing) {
      pause();
    } else {
      await play(track);
    }
  }

  if (authLoading || !profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <p style={{ color: 'var(--dim)', fontSize: 14 }}>Loading...</p>
      </div>
    );
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--surface-solid)', borderRadius: 14, border: '1px solid var(--border)',
    padding: 20, marginBottom: 20,
  };

  return (
    <div>
      <TopNav role={profile?.role} userName={profile?.full_name} />
      <div className="page-container">
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
            My Cart & Downloads
          </h1>
          <p style={{ color: 'var(--dim)', fontSize: 14 }}>
            Add tracks to your cart, then download directly or send secure links to any email.
          </p>
        </div>

        {/* CART SECTION */}
        <div style={cardStyle}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, margin: '0 0 12px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: -3, marginRight: 8 }}>
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              My Cart ({cartItems.length})
            </h2>
            {cartItems.length > 0 && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <input
                    type="email"
                    placeholder="Enter email to send links to..."
                    value={sendEmail}
                    onChange={e => setSendEmail(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      border: '1px solid var(--border)', background: 'var(--bg)',
                      color: 'var(--text)', fontSize: 14, fontFamily: "'DM Sans', sans-serif",
                    }}
                  />
                </div>
                <button
                  onClick={handleSendToEmail}
                  disabled={sending || !sendEmail}
                  style={{
                    padding: '10px 24px', borderRadius: 10, border: 'none',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
                    fontSize: 14, fontWeight: 700,
                    cursor: sending ? 'wait' : (!sendEmail ? 'not-allowed' : 'pointer'),
                    fontFamily: "'DM Sans', sans-serif", boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
                    display: 'flex', alignItems: 'center', gap: 8,
                    opacity: !sendEmail ? 0.5 : 1,
                    flexShrink: 0,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  {sending ? 'Sending...' : 'Send via Email'}
                </button>
                <button
                  onClick={handleDownloadAll}
                  disabled={sending}
                  style={{
                    padding: '10px 24px', borderRadius: 10, border: 'none',
                    background: 'var(--green)', color: '#fff',
                    fontSize: 14, fontWeight: 700,
                    cursor: sending ? 'wait' : 'pointer',
                    fontFamily: "'DM Sans', sans-serif", boxShadow: '0 2px 8px rgba(5,150,105,0.3)',
                    display: 'flex', alignItems: 'center', gap: 8,
                    flexShrink: 0,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  {sending ? 'Downloading...' : 'Download All'}
                </button>
              </div>
            )}
          </div>

          {cartItems.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--dim)', fontSize: 14 }}>
              Your cart is empty. Browse the catalog and add tracks to get started.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cartItems.map(item => {
                const t = item.track;
                const isPlaying = currentTrack?.id === t.id && playing;
                const isLoading = currentTrack?.id === t.id && audioLoading;
                return (
                  <div key={t.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                    background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)',
                  }}>
                    {/* Play button */}
                    <button
                      onClick={() => handlePlay(t)}
                      style={{
                        width: 36, height: 36, borderRadius: '50%', border: 'none',
                        background: 'var(--accent)', color: '#fff', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}
                    >
                      {isLoading ? <LoadingIcon size={16} color="#fff" /> :
                       isPlaying ? <PauseIcon size={16} color="#fff" /> :
                       <PlayIcon size={16} color="#fff" />}
                    </button>

                    {/* Track info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.title}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.artist} {t.genre ? `\u2022 ${t.genre}` : ''} {t.energy ? `\u2022 ${t.energy}` : ''}
                      </div>
                    </div>

                    {/* Tags */}
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                        background: t.vocal === 'Instrumental' ? 'rgba(99,102,241,0.12)' : 'rgba(236,72,153,0.12)',
                        color: t.vocal === 'Instrumental' ? '#6366f1' : '#ec4899',
                      }}>
                        {t.vocal === 'Instrumental' ? 'INST' : 'SONG'}
                      </span>
                    </div>

                    {/* Download single */}
                    <button
                      onClick={() => handleDirectDownload(t.id, t.title, t.artist)}
                      title="Download"
                      style={{
                        width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)',
                        background: 'none', color: 'var(--dim)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                    </button>
                    {/* Remove */}
                    <button
                      onClick={() => removeFromCart(t.id)}
                      title="Remove from cart"
                      style={{
                        width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)',
                        background: 'none', color: 'var(--dim)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        fontSize: 14,
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                );
              })}

              <div style={{
                marginTop: 8, padding: '10px 14px', background: 'rgba(99,102,241,0.06)',
                borderRadius: 8, fontSize: 12, color: 'var(--dim)', lineHeight: 1.5,
              }}>
                <strong>Download All</strong> saves files directly to your device. <strong>Send via Email</strong> sends secure links with full song info (links expire in 24 hours).
              </div>
            </div>
          )}
        </div>

        {/* DOWNLOAD HISTORY */}
        <div style={cardStyle}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
            Download History
          </h2>

          {loading ? (
            <p style={{ color: 'var(--dim)', fontSize: 14 }}>Loading download history...</p>
          ) : uniqueDownloads.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <p style={{ color: 'var(--dim)', fontSize: 14 }}>No downloads yet.</p>
              <p style={{ color: 'var(--dim)', fontSize: 12, marginTop: 6 }}>
                Tracks you send to your email will appear here.
              </p>
            </div>
          ) : (
            <>
              <div style={{
                marginBottom: 12, fontSize: 12, color: 'var(--dim)',
              }}>
                {uniqueDownloads.length} track{uniqueDownloads.length !== 1 ? 's' : ''} sent to email
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {uniqueDownloads.map(d => {
                  const t = d.track;
                  if (!t) {
                    return (
                      <div key={d.id} style={{
                        padding: '12px 14px', background: 'var(--bg)', borderRadius: 10,
                        border: '1px solid var(--border)', fontSize: 13, color: 'var(--dim)',
                      }}>
                        Track no longer available
                      </div>
                    );
                  }
                  return (
                    <div key={d.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                      background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.title}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.artist} {t.genre ? `\u2022 ${t.genre}` : ''} {t.vocal ? `\u2022 ${t.vocal}` : ''}
                          {t.writers ? ` \u2022 Writers: ${t.writers}` : ''}
                        </div>
                      </div>
                      <div style={{ flexShrink: 0 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                          background: t.vocal === 'Instrumental' ? 'rgba(99,102,241,0.12)' : 'rgba(236,72,153,0.12)',
                          color: t.vocal === 'Instrumental' ? '#6366f1' : '#ec4899',
                        }}>
                          {t.vocal === 'Instrumental' ? 'INST' : 'SONG'}
                        </span>
                      </div>
                      <div style={{ flexShrink: 0, fontSize: 11, color: 'var(--dim)', textAlign: 'right' }}>
                        {new Date(d.downloaded_at).toLocaleDateString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <Notification {...notif} />
      </div>
    </div>
  );
}
