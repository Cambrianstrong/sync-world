'use client';

import { useState, useEffect, useRef } from 'react';
import { ENERGY_LEVELS, VOCAL_TYPES } from '@/lib/types';
import TopNav from '@/components/nav/TopNav';
import GenreTagInput from '@/components/ui/GenreTagInput';
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
  const [submitTab, setSubmitTab] = useState<'catalog' | 'upload'>('catalog');
  // Catalog selection state
  const [availableTracks, setAvailableTracks] = useState<TrackOption[]>([]);
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([]);
  const [submitNotes, setSubmitNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [briefSubmissions, setBriefSubmissions] = useState<Record<string, BriefSubmission[]>>({});
  const [trackSearch, setTrackSearch] = useState('');
  // Upload state
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadMeta, setUploadMeta] = useState({ title: '', artist: '', genre: '', vocal: 'Male Vox', energy: 'Medium', mood: '', notes: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { notif, notify } = useNotification();

  useEffect(() => { loadBriefs(); }, []);

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
    } catch {}
  }

  async function loadBriefSubmissions(briefId: string) {
    try {
      const res = await fetch(`/api/brief-submit?briefId=${briefId}`);
      const json = await res.json();
      if (json.submissions) {
        setBriefSubmissions(prev => ({ ...prev, [briefId]: json.submissions }));
      }
    } catch {}
  }

  async function openSubmitModal(briefId: string) {
    setSubmitBriefId(briefId);
    setSubmitTab('catalog');
    setSelectedTrackIds([]);
    setSubmitNotes('');
    setTrackSearch('');
    setUploadFiles([]);
    setUploadMeta({ title: '', artist: '', genre: '', vocal: 'Male Vox', energy: 'Medium', mood: '', notes: '' });
    await loadTracks();
  }

  // Submit existing catalog tracks to brief
  async function handleSubmitCatalog() {
    if (!submitBriefId || selectedTrackIds.length === 0) {
      notify('Select at least one track.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/brief-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief_id: submitBriefId, track_ids: selectedTrackIds, notes: submitNotes }),
      });
      const json = await res.json();
      if (!res.ok) notify(`Error: ${json.error}`, 'error');
      else {
        notify(`${selectedTrackIds.length} track(s) submitted to brief!`, 'success');
        setSubmitBriefId(null);
        loadBriefSubmissions(submitBriefId);
      }
    } catch { notify('Failed to submit.', 'error'); }
    setSubmitting(false);
  }

  // Upload new files and submit to brief
  async function handleUploadToBrief() {
    if (!submitBriefId || uploadFiles.length === 0 || !uploadMeta.title || !uploadMeta.artist) {
      notify('Add files and fill in title and artist.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('brief_id', submitBriefId);
      formData.append('title', uploadMeta.title);
      formData.append('artist', uploadMeta.artist);
      formData.append('genre', uploadMeta.genre || 'Other');
      formData.append('vocal', uploadMeta.vocal);
      formData.append('energy', uploadMeta.energy);
      if (uploadMeta.mood) formData.append('mood', uploadMeta.mood);
      if (uploadMeta.notes) formData.append('notes', uploadMeta.notes);
      uploadFiles.forEach(f => formData.append('files', f));

      const res = await fetch('/api/brief-upload', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) notify(`Error: ${json.error}`, 'error');
      else {
        notify(`"${uploadMeta.title}" uploaded and submitted to brief!`, 'success');
        setSubmitBriefId(null);
        loadBriefSubmissions(submitBriefId);
      }
    } catch { notify('Upload failed. Please try again.', 'error'); }
    setSubmitting(false);
  }

  function toggleTrack(id: string) {
    setSelectedTrackIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(e.target.files || []);
    setUploadFiles(prev => [...prev, ...newFiles]);
    // Auto-fill title from first file name
    if (!uploadMeta.title && newFiles.length > 0) {
      let name = newFiles[0].name.replace(/\.[^.]+$/, '');
      name = name.replace(/[_\s-]*(main|clean|inst|instrumental|acap|acapella|vocal|mix|master|final|v\d+)$/i, '');
      name = name.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
      setUploadMeta(p => ({ ...p, title: name }));
    }
    if (e.target) e.target.value = '';
  }

  function removeUploadFile(index: number) {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
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
  const labelStyle: React.CSSProperties = {
    fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase',
    letterSpacing: 0.3, fontWeight: 500, marginBottom: 2,
  };

  const filteredTracks = trackSearch
    ? availableTracks.filter(t => `${t.title} ${t.artist} ${t.genre}`.toLowerCase().includes(trackSearch.toLowerCase()))
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
              ? 'See what music supervisors are looking for. Submit or upload tracks directly to any brief.'
              : profile.role === 'viewer'
              ? 'Your submitted music briefs.'
              : 'All submitted music briefs. Submit or upload tracks directly to any brief.'}
          </p>
        </div>

        {loading ? (
          <p style={{ color: 'var(--dim)', fontSize: 14 }}>Loading briefs...</p>
        ) : briefs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', background: 'var(--surface-solid)', borderRadius: 16, border: '1px solid var(--border)' }}>
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
                  <div onClick={() => handleExpand(b.id)} style={{
                    padding: '16px 18px', cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>
                          {b.project || b.brand || b.genre || 'Untitled Brief'}
                        </span>
                        {b.campaign_type && <span style={tagStyle}>{b.campaign_type}</span>}
                        {b.deadline && (
                          <span style={{ ...tagStyle, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>Due: {b.deadline}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 8 }}>
                        From <strong>{b.user_name || 'Unknown'}</strong> &bull; {new Date(b.created_at).toLocaleDateString()}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                        {b.genre && b.genre.split(',').map(g => <span key={g} style={tagStyle}>{g.trim()}</span>)}
                        {b.energy && <span style={{ ...tagStyle, background: 'rgba(245,158,11,0.1)', color: '#d97706' }}>{b.energy}</span>}
                        {b.vocal && <span style={{ ...tagStyle, background: 'rgba(236,72,153,0.1)', color: '#ec4899' }}>{b.vocal}</span>}
                        {b.genre_blends && <span style={{ ...tagStyle, background: 'rgba(5,150,105,0.1)', color: '#059669' }}>{b.genre_blends}</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: 18, color: 'var(--dim)', paddingLeft: 12, flexShrink: 0 }}>
                      {isExpanded ? '\u25B2' : '\u25BC'}
                    </span>
                  </div>

                  {/* Expanded */}
                  {isExpanded && (
                    <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
                        {(b.creative_themes || b.emotions || b.story_context) && (
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Creative Direction</div>
                            {b.creative_themes && <div style={{ fontSize: 13, marginBottom: 6, lineHeight: 1.5 }}><strong style={{ color: 'var(--dim)', fontSize: 11 }}>THEMES:</strong><br />{b.creative_themes}</div>}
                            {b.emotions && <div style={{ fontSize: 13, marginBottom: 6 }}><strong style={{ color: 'var(--dim)', fontSize: 11 }}>EMOTIONS:</strong><br />{b.emotions}</div>}
                            {b.story_context && <div style={{ fontSize: 13 }}><strong style={{ color: 'var(--dim)', fontSize: 11 }}>STORY:</strong><br />{b.story_context}</div>}
                          </div>
                        )}
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Sound Direction</div>
                          {b.subgenre && <div style={{ fontSize: 13, marginBottom: 4 }}><strong style={{ color: 'var(--dim)', fontSize: 11 }}>SUB-GENRE:</strong> {b.subgenre}</div>}
                          {b.instrumentation && <div style={{ fontSize: 13, marginBottom: 4 }}><strong style={{ color: 'var(--dim)', fontSize: 11 }}>INSTRUMENTATION:</strong> {b.instrumentation}</div>}
                          {(b.bpm_min || b.bpm_max) && <div style={{ fontSize: 13, marginBottom: 4 }}><strong style={{ color: 'var(--dim)', fontSize: 11 }}>BPM:</strong> {b.bpm_min || '?'} - {b.bpm_max || '?'}</div>}
                          {b.mood && <div style={{ fontSize: 13, marginBottom: 4 }}><strong style={{ color: 'var(--dim)', fontSize: 11 }}>MOOD:</strong> {b.mood}</div>}
                        </div>
                        {(b.reference || b.reference_artists) && (
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>References</div>
                            {b.reference && <div style={{ fontSize: 13, marginBottom: 4 }}><strong style={{ color: 'var(--dim)', fontSize: 11 }}>TRACKS:</strong> {b.reference}</div>}
                            {b.reference_artists && <div style={{ fontSize: 13 }}><strong style={{ color: 'var(--dim)', fontSize: 11 }}>ARTISTS:</strong> {b.reference_artists}</div>}
                          </div>
                        )}
                        {(b.description || b.contact_name) && (
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Additional</div>
                            {b.description && <div style={{ fontSize: 13, marginBottom: 4, lineHeight: 1.5 }}>{b.description}</div>}
                            {b.contact_name && <div style={{ fontSize: 13, color: 'var(--dim)' }}>Contact: {b.contact_name} {b.contact_email ? `(${b.contact_email})` : ''}</div>}
                          </div>
                        )}
                      </div>

                      {/* Submissions */}
                      {subs.length > 0 && (
                        <div style={{ marginTop: 20, padding: 16, background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                            Submitted Tracks ({subs.length})
                          </div>
                          {subs.map(s => (
                            <div key={s.id} style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13, flexWrap: 'wrap', gap: 4,
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

                      {/* Submit button */}
                      {canSubmit && (
                        <button onClick={(e) => { e.stopPropagation(); openSubmitModal(b.id); }} style={{
                          marginTop: 16, padding: '12px 20px', borderRadius: 10, border: 'none',
                          background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 600,
                          cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", width: '100%',
                        }}>
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

        {/* === SUBMIT MODAL === */}
        {submitBriefId && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            zIndex: 1000,
          }} onClick={() => setSubmitBriefId(null)}>
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: 'var(--surface-solid)', borderRadius: '16px 16px 0 0',
                width: '100%', maxWidth: 580, maxHeight: '90vh',
                display: 'flex', flexDirection: 'column',
                boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)',
              }}
            >
              {/* Modal header with tabs */}
              <div style={{ padding: '16px 20px 0', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>Submit to Brief</h3>
                <div style={{ display: 'flex', gap: 0 }}>
                  <button
                    onClick={() => setSubmitTab('catalog')}
                    style={{
                      flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 600,
                      fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
                      background: 'none', border: 'none',
                      borderBottom: submitTab === 'catalog' ? '2px solid var(--accent)' : '2px solid transparent',
                      color: submitTab === 'catalog' ? 'var(--text)' : 'var(--dim)',
                    }}
                  >
                    From Catalog
                  </button>
                  <button
                    onClick={() => setSubmitTab('upload')}
                    style={{
                      flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 600,
                      fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
                      background: 'none', border: 'none',
                      borderBottom: submitTab === 'upload' ? '2px solid var(--accent)' : '2px solid transparent',
                      color: submitTab === 'upload' ? 'var(--text)' : 'var(--dim)',
                    }}
                  >
                    Upload New
                  </button>
                </div>
              </div>

              {/* === CATALOG TAB === */}
              {submitTab === 'catalog' && (
                <>
                  <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                    <input
                      value={trackSearch} onChange={e => setTrackSearch(e.target.value)}
                      placeholder="Search tracks by title, artist, genre..."
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}
                    />
                  </div>
                  <div style={{ flex: 1, overflow: 'auto', padding: '4px 20px' }}>
                    {filteredTracks.length === 0 ? (
                      <p style={{ color: 'var(--dim)', fontSize: 13, textAlign: 'center', padding: 20 }}>
                        {availableTracks.length === 0 ? 'Loading tracks...' : 'No tracks match'}
                      </p>
                    ) : filteredTracks.map(t => {
                      const selected = selectedTrackIds.includes(t.id);
                      return (
                        <div key={t.id} onClick={() => toggleTrack(t.id)} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 8px', borderBottom: '1px solid var(--border)',
                          cursor: 'pointer', borderRadius: 8,
                          background: selected ? 'rgba(99,102,241,0.08)' : 'transparent',
                        }}>
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
                            <div style={{ fontSize: 11, color: 'var(--dim)' }}>{t.artist} &bull; {t.genre} &bull; {t.vocal === 'Instrumental' ? 'Instrumental' : 'Song'}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: 'var(--dim)' }}>{selectedTrackIds.length} selected</span>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => setSubmitBriefId(null)} style={{
                          padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border)',
                          background: 'var(--surface)', color: 'var(--text)', fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                        }}>Cancel</button>
                        <button onClick={handleSubmitCatalog} disabled={submitting || selectedTrackIds.length === 0} style={{
                          padding: '10px 20px', borderRadius: 8, border: 'none',
                          background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600,
                          cursor: submitting ? 'wait' : 'pointer', fontFamily: "'DM Sans', sans-serif",
                          opacity: submitting || selectedTrackIds.length === 0 ? 0.6 : 1,
                        }}>
                          {submitting ? 'Submitting...' : 'Submit'}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* === UPLOAD TAB === */}
              {submitTab === 'upload' && (
                <>
                  <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
                    {/* File picker */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        border: '2px dashed var(--border)', borderRadius: 12, padding: 24,
                        textAlign: 'center', cursor: 'pointer', marginBottom: 16,
                        background: 'var(--bg)', transition: 'border-color 0.2s',
                      }}
                    >
                      <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.5 }}>&#128193;</div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                        Tap to select audio files
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--dim)' }}>
                        WAV, AIFF, or MP3 &bull; Drag &amp; drop on desktop
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".wav,.aiff,.aif,.mp3,.m4a,.flac,.ogg,.wma,audio/*"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                      />
                    </div>

                    {/* Selected files */}
                    {uploadFiles.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', marginBottom: 6 }}>
                          {uploadFiles.length} file{uploadFiles.length !== 1 ? 's' : ''} selected
                        </div>
                        {uploadFiles.map((f, i) => (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 10px', background: 'var(--bg)', borderRadius: 8, marginBottom: 4, fontSize: 12,
                          }}>
                            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                              <span style={{ color: 'var(--dim)' }}>{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                              <button onClick={() => removeUploadFile(i)} style={{
                                background: 'none', border: 'none', color: 'var(--red)', fontSize: 16, cursor: 'pointer', padding: '0 4px', lineHeight: 1,
                              }}>&times;</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Track metadata */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <label style={labelStyle}>Song Title *</label>
                        <input value={uploadMeta.title} onChange={e => setUploadMeta(p => ({ ...p, title: e.target.value }))} placeholder="Song title" style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={labelStyle}>Artist *</label>
                        <input value={uploadMeta.artist} onChange={e => setUploadMeta(p => ({ ...p, artist: e.target.value }))} placeholder="Artist name" style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={labelStyle}>Genre</label>
                        <GenreTagInput value={uploadMeta.genre} onChange={v => setUploadMeta(p => ({ ...p, genre: v }))} placeholder="Select genre..." />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                          <label style={labelStyle}>Vocal Type</label>
                          <select value={uploadMeta.vocal} onChange={e => setUploadMeta(p => ({ ...p, vocal: e.target.value }))} style={{ width: '100%' }}>
                            {VOCAL_TYPES.map(v => <option key={v}>{v}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={labelStyle}>Energy</label>
                          <select value={uploadMeta.energy} onChange={e => setUploadMeta(p => ({ ...p, energy: e.target.value }))} style={{ width: '100%' }}>
                            {ENERGY_LEVELS.map(e => <option key={e}>{e}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>Mood</label>
                        <input value={uploadMeta.mood} onChange={e => setUploadMeta(p => ({ ...p, mood: e.target.value }))} placeholder="e.g. Confident, Energetic" style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={labelStyle}>Notes</label>
                        <textarea value={uploadMeta.notes} onChange={e => setUploadMeta(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Why this track fits the brief..." style={{ width: '100%' }} />
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: 'var(--dim)' }}>
                        {uploadFiles.length} file{uploadFiles.length !== 1 ? 's' : ''}
                      </span>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => setSubmitBriefId(null)} style={{
                          padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border)',
                          background: 'var(--surface)', color: 'var(--text)', fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                        }}>Cancel</button>
                        <button onClick={handleUploadToBrief} disabled={submitting || uploadFiles.length === 0 || !uploadMeta.title || !uploadMeta.artist} style={{
                          padding: '10px 20px', borderRadius: 8, border: 'none',
                          background: 'var(--green)', color: '#fff', fontSize: 13, fontWeight: 600,
                          cursor: submitting ? 'wait' : 'pointer', fontFamily: "'DM Sans', sans-serif",
                          opacity: submitting || uploadFiles.length === 0 || !uploadMeta.title || !uploadMeta.artist ? 0.6 : 1,
                        }}>
                          {submitting ? 'Uploading...' : 'Upload & Submit'}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <Notification {...notif} />
      </div>
    </div>
  );
}
