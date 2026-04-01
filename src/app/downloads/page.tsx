'use client';

import { useState, useEffect, useMemo } from 'react';
import TopNav from '@/components/nav/TopNav';
import Notification, { useNotification } from '@/components/ui/Notification';
import { useAuth } from '@/hooks/useAuth';

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
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { notif } = useNotification();

  useEffect(() => {
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
    loadDownloads();
  }, []);

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

  if (authLoading || !profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <p style={{ color: 'var(--dim)', fontSize: 14 }}>Loading...</p>
      </div>
    );
  }

  const thStyle: React.CSSProperties = {
    textAlign: 'left', padding: '12px 16px', fontSize: 11,
    textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--dim)',
    borderBottom: '1px solid var(--border)', fontWeight: 600,
  };

  const tdStyle: React.CSSProperties = {
    padding: '14px 16px', borderBottom: '1px solid var(--border)',
    verticalAlign: 'top',
  };

  return (
    <div>
      <TopNav role={profile?.role} userName={profile?.full_name} />
      <div className="page-container">
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
            My Downloads
          </h1>
          <p style={{ color: 'var(--dim)', fontSize: 14 }}>
            Keep track of songs you&apos;ve already downloaded. This helps you avoid re-listening to tracks you&apos;ve already reviewed.
          </p>
        </div>

        {loading ? (
          <p style={{ color: 'var(--dim)', fontSize: 14 }}>Loading download history...</p>
        ) : uniqueDownloads.length === 0 ? (
          <div style={{
            padding: 40, textAlign: 'center', background: 'var(--surface-solid)',
            borderRadius: 16, border: '1px solid var(--border)',
          }}>
            <p style={{ color: 'var(--dim)', fontSize: 15 }}>No downloads yet.</p>
            <p style={{ color: 'var(--dim)', fontSize: 13, marginTop: 8 }}>
              When you check out tracks from the catalog, they&apos;ll appear here so you can keep track.
            </p>
          </div>
        ) : (
          <>
            <div style={{
              marginBottom: 16, padding: '10px 16px', background: 'var(--surface-solid)',
              borderRadius: 10, border: '1px solid var(--border)', fontSize: 13, color: 'var(--dim)',
            }}>
              {uniqueDownloads.length} unique track{uniqueDownloads.length !== 1 ? 's' : ''} downloaded
              {downloads.length !== uniqueDownloads.length && ` (${downloads.length} total downloads)`}
            </div>

            <div className="table-scroll">
              <table style={{
                width: '100%', borderCollapse: 'separate', borderSpacing: 0,
                background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)',
              }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Title</th>
                    <th style={thStyle}>Artist / Writers</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Genre</th>
                    <th style={thStyle}>Energy</th>
                    <th style={thStyle}>Mood</th>
                    <th style={thStyle}>BPM / Key</th>
                    <th style={thStyle}>Downloaded</th>
                  </tr>
                </thead>
                <tbody>
                  {uniqueDownloads.map((d) => {
                    const t = d.track;
                    if (!t) {
                      return (
                        <tr key={d.id}>
                          <td style={{ ...tdStyle, fontSize: 13, color: 'var(--dim)' }} colSpan={8}>
                            Track no longer available
                          </td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={d.id}>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{t.title}</div>
                          {t.subgenre && <div style={{ color: 'var(--dim)', fontSize: 11 }}>{t.subgenre}</div>}
                        </td>
                        <td style={tdStyle}>
                          <div style={{ fontSize: 13 }}>{t.artist}</div>
                          {t.writers && <div style={{ color: 'var(--dim)', fontSize: 11 }}>Writers: {t.writers}</div>}
                          {t.producers && <div style={{ color: 'var(--dim)', fontSize: 11 }}>Prod: {t.producers}</div>}
                        </td>
                        <td style={tdStyle}>
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                            background: t.vocal === 'Instrumental' ? 'rgba(99,102,241,0.1)' : 'rgba(236,72,153,0.1)',
                            color: t.vocal === 'Instrumental' ? '#6366f1' : '#ec4899',
                          }}>
                            {t.vocal === 'Instrumental' ? 'Instrumental' : 'Song'}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, fontSize: 13 }}>{t.genre}</td>
                        <td style={{ ...tdStyle, fontSize: 13 }}>{t.energy}</td>
                        <td style={{ ...tdStyle, fontSize: 13 }}>{t.mood || '\u2014'}</td>
                        <td style={tdStyle}>
                          <div style={{ fontSize: 13 }}>{t.bpm ? `${t.bpm} BPM` : '\u2014'}</div>
                          {t.key && <div style={{ color: 'var(--dim)', fontSize: 11 }}>{t.key}</div>}
                        </td>
                        <td style={{ ...tdStyle, fontSize: 12, color: 'var(--dim)' }}>
                          {new Date(d.downloaded_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <Notification {...notif} />
      </div>
    </div>
  );
}
