'use client';

import { useState, useEffect } from 'react';
import TopNav from '@/components/nav/TopNav';
import Notification, { useNotification } from '@/components/ui/Notification';
import { useAuth } from '@/hooks/useAuth';

interface MusicBrief {
  id: string;
  user_name: string | null;
  user_email: string | null;
  project: string | null;
  brand: string | null;
  campaign_type: string | null;
  deadline: string | null;
  creative_themes: string | null;
  emotions: string | null;
  story_context: string | null;
  genre: string | null;
  subgenre: string | null;
  genre_blends: string | null;
  energy: string | null;
  vocal: string | null;
  bpm_min: number | null;
  bpm_max: number | null;
  instrumentation: string | null;
  reference: string | null;
  reference_artists: string | null;
  description: string | null;
  mood: string | null;
  theme: string | null;
  contact_name: string | null;
  contact_email: string | null;
  created_at: string;
}

interface TrackOption {
  id: string;
  title: string;
  artist: string;
  genre: string;
  vocal: string;
}

interface BriefSubmission {
  id: string;
  track_id: string;
  submitted_by_name: string;
  created_at: string;
  tracks: TrackOption | null;
}

export default function RequestsPage() {
  const { profile, loading: authLoading } = useAuth();
  const [briefs, setBriefs] = useState<MusicBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submitBriefId, setSubmitBriefId] = useState<string | null>(null);
  const [availableTracks, setAvailableTracks] = useState<TrackOption[]>([]);
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([]);
  const [submitNotes, setSubmitNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [briefSubmissions, setBriefSubmissions] = useState<Record<string, BriefSubmission[]>>({});
  const [trackSearch, setTrackSearch] = useState('');
  const { notif, notify } = useNotification();

  useEffect(() => {
    loadBriefs();
  }, []);

  async function loadBriefs() {
    try {
      const res = await fetch('/api/requests');
      const json = await res.json();
      if (json.requests) setBriefs(json.requests);
    } catch (err) {
      console.error('Failed to load briefs:', err);
    }
    setLoading(false);
  }

  async function loadTracks() {
    try {
      const res = await fetch('/api/tracks');
      const json = await res.json();
      if (json.tracks) setAvailableTracks(json.tracks);
    } catch {
      // Fallback: load from Supabase client
    }
  }

  async function loadBriefSubmissions(briefId: string) {
    try {
      const res = await fetch(`/api/brief-submit?briefId=${briefId}`);
      const json = await res.json();
      if (json.submissions) {
        setBriefSubmissions(prev => ({ ...prev, [briefId]: json.submissions }));
      }
    } catch (err) {
      console.error('Failed to load submissions:', err);
    }
  }

  async function openSubmitModal(briefId: string) {
    setSubmitBriefId(briefId);
    setSelectedTrackIds([]);
    setSubmitNotes('');
    setTrackSearch('');
    await loadTracks();
  }

  async function handleSubmitToBrief() {
    if (!submitBriefId || selectedTrackIds.length === 0) {
      notify('Select at least one track to submit.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/brief-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief_id: submitBriefId,
          track_ids: selectedTrackIds,
          notes: submitNotes,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        notify(`Error: ${json.error}`, 'error');
      } else {
        notify(`${selectedTrackIds.length} track(s) submitted to brief!`, 'success');
        setSubmitBriefId(null);
        loadBriefSubmissions(submitBriefId);
      }
    } catch {
      notify('Failed to submit. Please try again.', 'error');
    }
    setSubmitting(false);
  }

  function toggleTrack(id: string) {
    setSelectedTrackIds(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  }

  async function handleExpand(briefId: string) {
    const isExpanding = expandedId !== briefId;
    setExpandedId(isExpanding ? briefId : null);
    if (isExpanding && !briefSubmissions[briefId]) {
      loadBriefSubmissions(briefId);
    }
  }

  if (authLoading || !profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <p style={{ color: 'var(--dim)', fontSize: 14 }}>Loading...</p>
      </div>
    );
  }

  const canSubmit = profile.role === 'producer' || profile.role === 'admin';

  const tagStyle: React.CSSProperties = {
    display: 'inline-block', padding: '3px 8px', borderRadius: 6,
    fontSize: 11, fontWeight: 600, marginRight: 4, marginBottom: 4,
    background: 'rgba(99,102,241,0.1)', color: '#6366f1',
  };

  const filteredTracks = trackSearch
    ? availableTracks.filter(t =>
        `${t.title} ${t.artist} ${t.genre}`.toLowerCase().includes(trackSearch.toLowerCase())
      )
    : availableTracks;

  return (
    <div>
      <TopNav role={profile?.role} userName={profile?.full_name} />
      <div className="page-container">
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
            Music Briefs
          </h1>
          <p style={{ color: 'var(--dim)', fontSize: 14 }}>
            {profile.role === 'producer'
              ? 'See what music supervisors are looking for. Submit your tracks directly to any brief.'
              : profile.role === 'viewer'
              ? 'Your submitted music briefs.'
              : 'All submitted music briefs. Submit tracks directly to any brief.'}
          </p>
        </div>

        {loading ? (
          <p style={{ color: 'var(--dim)', fontSize: 14 }}>Loading briefs...</p>
        ) : briefs.length === 0 ? (
          <div style={{
            padding: 40, textAlign: 'center', background: 'var(--surface-solid)',
            borderRadius: 16, border: '1px solid var(--border)',
          }}>
            <p style={{ color: 'var(--dim)', fontSize: 15 }}>No music briefs yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {briefs.map((b) => {
              const isExpanded = expandedId === b.id;
              const subs = briefSubmissions[b.id] || [];
              return (
                <div key={b.id} style={{
                  background: 'var(--surface-solid)', border: '1px solid var(--border)',
                  borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
                }}>
                  {/* Brief Header */}
                  <div
                    onClick={() => handleExpand(b.id)}
                    style={{
                      padding: '16px 18px', cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>
                          {b.project || b.brand || b.genre || 'Untitled Brief'}
                        </span>
                        {b.campaign_type && <span style={tagStyle}>{b.campaign_type}</span>}
                        {b.deadline && (
                          <span style={{ ...tagStyle, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                            Due: {b.deadline}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 8 }}>
                        From <strong>{b.user_name || 'Unknown'}</strong>
                        {' \u2022 '}
                        {new Date(b.created_at).toLocaleDateString()}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                        {b.genre && b.genre.split(',').map(g => (
                          <span key={g} style={tagStyle}>{g.trim()}</span>
                        ))}
                        {b.energy && <span style={{ ...tagStyle, background: 'rgba(245,158,11,0.1)', color: '#d97706' }}>{b.energy}</span>}
                        {b.vocal && <span style={{ ...tagStyle, background: 'rgba(236,72,153,0.1)', color: '#ec4899' }}>{b.vocal}</span>}
                        {b.genre_blends && <span style={{ ...tagStyle, background: 'rgba(5,150,105,0.1)', color: '#059669' }}>{b.genre_blends}</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: 18, color: 'var(--dim)', paddingLeft: 12, flexShrink: 0 }}>
                      {isExpanded ? '\u25B2' : '\u25BC'}
                    </span>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
                        {/* Creative Direction */}
                        {(b.creative_themes || b.emotions || b.story_context) && (
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                              Creative Direction
                            </div>
                            {b.creative_themes && (
                              <div style={{ fontSize: 13, marginBottom: 6, lineHeight: 1.5 }}>
                                <strong style={{ color: 'var(--dim)', fontSize: 11 }}>THEMES:</strong><br />
                                {b.creative_themes}
                              </div>
                            )}
                            {b.emotions && (
                              <div style={{ fontSize: 13, marginBottom: 6 }}>
                                <strong style={{ color: 'var(--dim)', fontSize: 11 }}>EMOTIONS:</strong><br />
                                {b.emotions}
                              </div>
                            )}
                            {b.story_context && (
                              <div style={{ fontSize: 13 }}>
                                <strong style={{ color: 'var(--dim)', fontSize: 11 }}>STORY:</strong><br />
                                {b.story_context}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Sound Direction */}
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                            Sound Direction
                          </div>
                          {b.subgenre && <div style={{ fontSize: 13, marginBottom: 4 }}><strong style={{ color: 'var(--dim)', fontSize: 11 }}>SUB-GENRE:</strong> {b.subgenre}</div>}
                          {b.instrumentation && <div style={{ fontSize: 13, marginBottom: 4 }}><strong style={{ color: 'var(--dim)', fontSize: 11 }}>INSTRUMENTATION:</strong> {b.instrumentation}</div>}
                          {(b.bpm_min || b.bpm_max) && <div style={{ fontSize: 13, marginBottom: 4 }}><strong style={{ color: 'var(--dim)', fontSize: 11 }}>BPM:</strong> {b.bpm_min || '?'} - {b.bpm_max || '?'}</div>}
                          {b.mood && <div style={{ fontSize: 13, marginBottom: 4 }}><strong style={{ color: 'var(--dim)', fontSize: 11 }}>MOOD:</strong> {b.mood}</div>}
                        </div>

                        {/* References */}
                        {(b.reference || b.reference_artists) && (
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                              References
                            </div>
                            {b.reference && <div style={{ fontSize: 13, marginBottom: 4 }}><strong style={{ color: 'var(--dim)', fontSize: 11 }}>TRACKS:</strong> {b.reference}</div>}
                            {b.reference_artists && <div style={{ fontSize: 13 }}><strong style={{ color: 'var(--dim)', fontSize: 11 }}>ARTISTS:</strong> {b.reference_artists}</div>}
                          </div>
                        )}

                        {/* Additional */}
                        {(b.description || b.contact_name) && (
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                              Additional
                            </div>
                            {b.description && <div style={{ fontSize: 13, marginBottom: 4, lineHeight: 1.5 }}>{b.description}</div>}
                            {b.contact_name && <div style={{ fontSize: 13, color: 'var(--dim)' }}>Contact: {b.contact_name} {b.contact_email ? `(${b.contact_email})` : ''}</div>}
                          </div>
                        )}
                      </div>

                      {/* Submissions to this brief */}
                      {subs.length > 0 && (
                        <div style={{ marginTop: 20, padding: 16, background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                            Submitted Tracks ({subs.length})
                          </div>
                          {subs.map(s => (
                            <div key={s.id} style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13,
                              flexWrap: 'wrap', gap: 4,
                            }}>
                              <div>
                                <strong>{(s.tracks as any)?.title || 'Unknown'}</strong>
                                <span style={{ color: 'var(--dim)' }}> by {(s.tracks as any)?.artist || '?'}</span>
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--dim)' }}>
                                by {s.submitted_by_name} &bull; {new Date(s.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Submit to Brief button */}
                      {canSubmit && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openSubmitModal(b.id); }}
                          style={{
                            marginTop: 16, padding: '10px 20px', borderRadius: 10, border: 'none',
                            background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600,
                            cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                            width: '100%',
                          }}
                        >
                          Submit Tracks to This Brief
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Submit to Brief Modal */}
        {submitBriefId && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 16,
          }} onClick={() => setSubmitBriefId(null)}>
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: 'var(--surface-solid)', borderRadius: 16,
                width: '100%', maxWidth: 540, maxHeight: '80vh',
                display: 'flex', flexDirection: 'column',
                boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)',
              }}
            >
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Submit Tracks to Brief</h3>
                <p style={{ fontSize: 12, color: 'var(--dim)' }}>
                  Select tracks from the catalog to submit. They&apos;ll be linked to this brief.
                </p>
              </div>

              <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)' }}>
                <input
                  value={trackSearch}
                  onChange={e => setTrackSearch(e.target.value)}
                  placeholder="Search tracks by title, artist, genre..."
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}
                />
              </div>

              <div style={{ flex: 1, overflow: 'auto', padding: '8px 24px' }}>
                {filteredTracks.length === 0 ? (
                  <p style={{ color: 'var(--dim)', fontSize: 13, textAlign: 'center', padding: 20 }}>
                    {availableTracks.length === 0 ? 'Loading tracks...' : 'No tracks match your search'}
                  </p>
                ) : (
                  filteredTracks.map(t => {
                    const selected = selectedTrackIds.includes(t.id);
                    return (
                      <div
                        key={t.id}
                        onClick={() => toggleTrack(t.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 8px', borderBottom: '1px solid var(--border)',
                          cursor: 'pointer', borderRadius: 8,
                          background: selected ? 'rgba(99,102,241,0.08)' : 'transparent',
                        }}
                      >
                        <div style={{
                          width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                          border: selected ? 'none' : '2px solid var(--border)',
                          background: selected ? 'var(--accent)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 12, fontWeight: 700,
                        }}>
                          {selected && '\u2713'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{t.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--dim)' }}>
                            {t.artist} &bull; {t.genre} &bull; {t.vocal === 'Instrumental' ? 'Instrumental' : 'Song'}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
                <textarea
                  value={submitNotes}
                  onChange={e => setSubmitNotes(e.target.value)}
                  placeholder="Optional notes about your submission..."
                  rows={2}
                  style={{ width: '100%', marginBottom: 12, fontSize: 13, borderRadius: 8 }}
                />
                <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'var(--dim)' }}>
                    {selectedTrackIds.length} track{selectedTrackIds.length !== 1 ? 's' : ''} selected
                  </span>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => setSubmitBriefId(null)}
                      style={{
                        padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)',
                        background: 'var(--surface)', color: 'var(--text)', fontSize: 13,
                        cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitToBrief}
                      disabled={submitting || selectedTrackIds.length === 0}
                      style={{
                        padding: '10px 24px', borderRadius: 8, border: 'none',
                        background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600,
                        cursor: submitting ? 'wait' : 'pointer', fontFamily: "'DM Sans', sans-serif",
                        opacity: submitting || selectedTrackIds.length === 0 ? 0.6 : 1,
                      }}
                    >
                      {submitting ? 'Submitting...' : 'Submit'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <Notification {...notif} />
      </div>
    </div>
  );
}
