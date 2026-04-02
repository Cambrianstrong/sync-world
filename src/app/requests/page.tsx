'use client';

import { useState, useEffect, useRef } from 'react';
import { ENERGY_LEVELS, VOCAL_TYPES, PUBLISHERS } from '@/lib/types';
import TopNav from '@/components/nav/TopNav';
import GenreTagInput from '@/components/ui/GenreTagInput';
import Notification, { useNotification } from '@/components/ui/Notification';
import { useAuth } from '@/hooks/useAuth';

type BriefStatus = 'Open' | 'In Review' | 'Filled' | 'Closed';

const BRIEF_STATUSES: BriefStatus[] = ['Open', 'In Review', 'Filled', 'Closed'];

const briefStatusColor: Record<BriefStatus, string> = {
  'Open': 'var(--green)',
  'In Review': 'var(--orange)',
  'Filled': 'var(--accent)',
  'Closed': 'var(--dim)',
};

const briefStatusBg: Record<BriefStatus, string> = {
  'Open': 'rgba(5,150,105,0.1)',
  'In Review': 'rgba(217,119,6,0.1)',
  'Filled': 'rgba(26,26,46,0.08)',
  'Closed': 'rgba(107,114,128,0.1)',
};

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
  status: BriefStatus | null;
  user_id: string | null;
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
  // Upload state — multi-song grouping
  const [uploadSongs, setUploadSongs] = useState<{ name: string; title: string; artist: string; files: File[] }[]>([]);
  const [uploadShared, setUploadShared] = useState({ producers: '', writers: '', publisher: '', genre: '', vocal: 'Male Vox', energy: 'Medium', mood: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [editBrief, setEditBrief] = useState<MusicBrief | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState(false);
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
    setUploadSongs([]);
    setUploadShared({ producers: profile?.full_name || '', writers: '', publisher: '', genre: '', vocal: 'Male Vox', energy: 'Medium', mood: '' });
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
        const briefId = submitBriefId;
        setSubmitBriefId(null);
        loadBriefSubmissions(briefId);
      }
    } catch { notify('Failed to submit.', 'error'); }
    setSubmitting(false);
  }

  // Upload multiple songs to brief
  async function handleUploadToBrief() {
    if (!submitBriefId || uploadSongs.length === 0) {
      notify('Add files first.', 'error');
      return;
    }
    // Check each song has a title
    const missing = uploadSongs.find(s => !s.title);
    if (missing) { notify('Every song needs a title.', 'error'); return; }

    setSubmitting(true);
    let successCount = 0;
    try {
      for (const song of uploadSongs) {
        const formData = new FormData();
        formData.append('brief_id', submitBriefId);
        formData.append('title', song.title);
        formData.append('artist', song.artist || 'TBD');
        formData.append('genre', uploadShared.genre || 'Other');
        formData.append('vocal', uploadShared.vocal);
        formData.append('energy', uploadShared.energy);
        if (uploadShared.producers) formData.append('producers', uploadShared.producers);
        if (uploadShared.writers) formData.append('writers', uploadShared.writers);
        if (uploadShared.publisher) formData.append('publisher', uploadShared.publisher);
        if (uploadShared.mood) formData.append('mood', uploadShared.mood);
        song.files.forEach(f => formData.append('files', f));

        const res = await fetch('/api/brief-upload', { method: 'POST', body: formData });
        if (res.ok) successCount++;
      }
      if (successCount > 0) {
        notify(`${successCount} song${successCount !== 1 ? 's' : ''} uploaded and submitted to brief!`, 'success');
        const briefId = submitBriefId;
        setSubmitBriefId(null);
        loadBriefSubmissions(briefId);
      } else {
        notify('Upload failed. Please try again.', 'error');
      }
    } catch { notify('Upload failed. Please try again.', 'error'); }
    setSubmitting(false);
  }

  function toggleTrack(id: string) {
    setSelectedTrackIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  }

  function extractSongName(fileName: string): string {
    let name = fileName.replace(/\.[^.]+$/, '');
    name = name.replace(/[_\s-]*(main|clean|inst|instrumental|acap|acapella|vocal|mix|master|final|v\d+)$/i, '');
    name = name.replace(/[_\s-]+$/, '');
    return name || fileName;
  }

  function formatTitle(songName: string): string {
    return songName.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length === 0) return;

    // Group new files by song name
    const groups: Record<string, File[]> = {};
    for (const file of newFiles) {
      const songName = extractSongName(file.name);
      if (!groups[songName]) groups[songName] = [];
      groups[songName].push(file);
    }

    // Merge with existing songs or create new ones
    setUploadSongs(prev => {
      const updated = [...prev];
      for (const [name, files] of Object.entries(groups)) {
        const existing = updated.find(s => s.name === name);
        if (existing) {
          existing.files = [...existing.files, ...files];
        } else {
          updated.push({ name, title: formatTitle(name), artist: '', files });
        }
      }
      return updated;
    });

    if (e.target) e.target.value = '';
  }

  function removeSong(index: number) {
    setUploadSongs(prev => prev.filter((_, i) => i !== index));
  }

  function updateSongField(index: number, field: 'title' | 'artist', value: string) {
    setUploadSongs(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  }

  async function handleExpand(briefId: string) {
    const isExpanding = expandedId !== briefId;
    setExpandedId(isExpanding ? briefId : null);
    if (isExpanding && !briefSubmissions[briefId]) {
      loadBriefSubmissions(briefId);
    }
  }

  function openEditBrief(brief: MusicBrief) {
    setEditBrief(brief);
    setEditForm({
      project: brief.project || '',
      brand: brief.brand || '',
      campaign_type: brief.campaign_type || '',
      deadline: brief.deadline || '',
      creative_themes: brief.creative_themes || '',
      emotions: brief.emotions || '',
      story_context: brief.story_context || '',
      genre: brief.genre || '',
      subgenre: brief.subgenre || '',
      genre_blends: brief.genre_blends || '',
      energy: brief.energy || '',
      vocal: brief.vocal || '',
      bpm_min: brief.bpm_min?.toString() || '',
      bpm_max: brief.bpm_max?.toString() || '',
      instrumentation: brief.instrumentation || '',
      reference: brief.reference || '',
      reference_artists: brief.reference_artists || '',
      description: brief.description || '',
      mood: brief.mood || '',
      contact_name: brief.contact_name || '',
      contact_email: brief.contact_email || '',
    });
  }

  async function saveEditBrief() {
    if (!editBrief) return;
    setSavingEdit(true);
    try {
      const res = await fetch('/api/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editBrief.id,
          ...editForm,
          bpm_min: editForm.bpm_min ? parseInt(editForm.bpm_min) : null,
          bpm_max: editForm.bpm_max ? parseInt(editForm.bpm_max) : null,
        }),
      });
      if (res.ok) {
        notify('Brief updated!', 'success');
        setEditBrief(null);
        loadBriefs();
      } else {
        const json = await res.json();
        notify(`Error: ${json.error}`, 'error');
      }
    } catch {
      notify('Failed to save.', 'error');
    }
    setSavingEdit(false);
  }

  // Can edit if admin or if user owns the brief
  function canEditBrief(brief: MusicBrief): boolean {
    if (!profile) return false;
    if (profile.role === 'admin') return true;
    return brief.user_id === profile.id;
  }

  async function updateBriefStatus(briefId: string, newStatus: BriefStatus) {
    try {
      const res = await fetch('/api/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: briefId, status: newStatus }),
      });
      if (res.ok) {
        setBriefs(prev => prev.map(b => b.id === briefId ? { ...b, status: newStatus } : b));
        notify(`Brief status updated to ${newStatus}`, 'info');
      } else {
        const json = await res.json();
        notify(`Error: ${json.error}`, 'error');
      }
    } catch {
      notify('Failed to update status.', 'error');
    }
  }

  const filteredBriefs = statusFilter === 'All' ? briefs : briefs.filter(b => (b.status || 'Open') === statusFilter);

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

        {/* Status filter tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {['All', ...BRIEF_STATUSES].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
                border: statusFilter === s ? 'none' : '1px solid var(--border)',
                background: statusFilter === s ? 'var(--accent)' : 'var(--surface-solid)',
                color: statusFilter === s ? '#fff' : 'var(--dim)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {s}
              {s !== 'All' && (
                <span style={{ marginLeft: 4, opacity: 0.7 }}>
                  ({briefs.filter(b => (b.status || 'Open') === s).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: 'var(--dim)', fontSize: 14 }}>Loading briefs...</p>
        ) : briefs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', background: 'var(--surface-solid)', borderRadius: 16, border: '1px solid var(--border)' }}>
            <p style={{ color: 'var(--dim)', fontSize: 15 }}>No music briefs yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filteredBriefs.map((b) => {
              const isExpanded = expandedId === b.id;
              const subs = briefSubmissions[b.id] || [];
              return (
                <div key={b.id} style={{
                  background: 'var(--surface-solid)', border: '1px solid var(--border)',
                  borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
                }}>
                  {/* Brief Header */}
                  <div role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && handleExpand(b.id)} onClick={() => handleExpand(b.id)} style={{
                    padding: '16px 18px', cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>
                          {b.project || b.brand || b.genre || 'Untitled Brief'}
                        </span>
                        {/* Status badge */}
                        <span style={{
                          padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                          background: briefStatusBg[(b.status || 'Open') as BriefStatus],
                          color: briefStatusColor[(b.status || 'Open') as BriefStatus],
                        }}>
                          {b.status || 'Open'}
                        </span>
                        {/* Admin inline status change */}
                        {profile.role === 'admin' && (
                          <select
                            value={b.status || 'Open'}
                            onClick={e => e.stopPropagation()}
                            onChange={e => { e.stopPropagation(); updateBriefStatus(b.id, e.target.value as BriefStatus); }}
                            style={{
                              padding: '2px 6px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                              border: '1px solid var(--border)', background: 'var(--surface-solid)',
                              color: 'var(--dim)', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                            }}
                          >
                            {BRIEF_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        )}
                        {b.campaign_type && <span style={tagStyle}>{b.campaign_type}</span>}
                        {b.deadline && (
                          <span style={{ ...tagStyle, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>Due: {b.deadline}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span>
                          From <strong>{b.user_name || 'Unknown'}</strong>
                          {b.user_email && <span> ({b.user_email})</span>}
                          {' '}&bull; {new Date(b.created_at).toLocaleDateString()}
                        </span>
                        {canEditBrief(b) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditBrief(b); }}
                            style={{
                              padding: '2px 10px', borderRadius: 6, border: '1px solid var(--border)',
                              background: 'var(--surface-solid)', color: 'var(--dim)', fontSize: 11,
                              fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                            }}
                          >
                            Edit
                          </button>
                        )}
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
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(250px, 100%), 1fr))', gap: 20 }}>
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
          <div role="presentation" style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            zIndex: 1000,
          }} onClick={() => setSubmitBriefId(null)}>
            <div
              role="dialog" aria-label="Submit to brief"
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
                <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>Submit to Brief</h2>
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
                        <div key={t.id} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && toggleTrack(t.id)} onClick={() => toggleTrack(t.id)} style={{
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
                        WAV, AIFF, or MP3 &bull; Select multiple files &bull; Auto-groups by song name
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

                    {/* Detected songs */}
                    {uploadSongs.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--green)', textTransform: 'uppercase', marginBottom: 8 }}>
                          {uploadSongs.length} song{uploadSongs.length !== 1 ? 's' : ''} detected
                        </div>
                        {uploadSongs.map((song, i) => (
                          <div key={i} style={{
                            padding: '10px 12px', background: 'var(--bg)', borderRadius: 10,
                            marginBottom: 8, border: '1px solid var(--border)',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                              <input
                                value={song.title}
                                onChange={e => updateSongField(i, 'title', e.target.value)}
                                style={{ flex: 1, fontWeight: 600, fontSize: 13, padding: '4px 8px', borderRadius: 6 }}
                                placeholder="Song title *"
                              />
                              <button onClick={() => removeSong(i)} style={{
                                background: 'none', border: 'none', color: 'var(--red)', fontSize: 16,
                                cursor: 'pointer', padding: '0 6px', lineHeight: 1, flexShrink: 0,
                              }}>&times;</button>
                            </div>
                            <input
                              value={song.artist}
                              onChange={e => updateSongField(i, 'artist', e.target.value)}
                              style={{ width: '100%', fontSize: 12, padding: '4px 8px', borderRadius: 6, marginBottom: 4 }}
                              placeholder="Artist name (can be different per song)"
                            />
                            <div style={{ fontSize: 11, color: 'var(--dim)' }}>
                              {song.files.map(f => f.name).join(', ')}
                              <span style={{ marginLeft: 6 }}>({(song.files.reduce((s, f) => s + f.size, 0) / 1024 / 1024).toFixed(1)} MB)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Shared metadata for all songs */}
                    {uploadSongs.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase' }}>
                          Shared Info (applies to all {uploadSongs.length} songs)
                        </div>
                        <div className="grid-2col">
                          <div>
                            <label style={labelStyle}>Producer(s)</label>
                            <input value={uploadShared.producers} onChange={e => setUploadShared(p => ({ ...p, producers: e.target.value }))} placeholder="Your name auto-filled" style={{ width: '100%' }} />
                          </div>
                          <div>
                            <label style={labelStyle}>Writer(s)</label>
                            <input value={uploadShared.writers} onChange={e => setUploadShared(p => ({ ...p, writers: e.target.value }))} placeholder="Songwriter names" style={{ width: '100%' }} />
                          </div>
                        </div>
                        <div>
                          <label style={labelStyle}>Publisher</label>
                          <select value={uploadShared.publisher} onChange={e => setUploadShared(p => ({ ...p, publisher: e.target.value }))} style={{ width: '100%' }}>
                            <option value="">Select Publisher...</option>
                            {PUBLISHERS.map(p => <option key={p}>{p}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={labelStyle}>Genre</label>
                          <GenreTagInput value={uploadShared.genre} onChange={v => setUploadShared(p => ({ ...p, genre: v }))} placeholder="Select genre..." />
                        </div>
                        <div className="grid-2col" style={{ gap: 10 }}>
                          <div>
                            <label style={labelStyle}>Vocal Type</label>
                            <select value={uploadShared.vocal} onChange={e => setUploadShared(p => ({ ...p, vocal: e.target.value }))} style={{ width: '100%' }}>
                              {VOCAL_TYPES.map(v => <option key={v}>{v}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={labelStyle}>Energy</label>
                            <select value={uploadShared.energy} onChange={e => setUploadShared(p => ({ ...p, energy: e.target.value }))} style={{ width: '100%' }}>
                              {ENERGY_LEVELS.map(e => <option key={e}>{e}</option>)}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label style={labelStyle}>Mood</label>
                          <input value={uploadShared.mood} onChange={e => setUploadShared(p => ({ ...p, mood: e.target.value }))} placeholder="e.g. Confident, Energetic" style={{ width: '100%' }} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: 'var(--dim)' }}>
                        {uploadSongs.length} song{uploadSongs.length !== 1 ? 's' : ''} &bull; {uploadSongs.reduce((s, song) => s + song.files.length, 0)} files
                      </span>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => setSubmitBriefId(null)} style={{
                          padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border)',
                          background: 'var(--surface)', color: 'var(--text)', fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                        }}>Cancel</button>
                        <button onClick={handleUploadToBrief} disabled={submitting || uploadSongs.length === 0} style={{
                          padding: '10px 20px', borderRadius: 8, border: 'none',
                          background: 'var(--green)', color: '#fff', fontSize: 13, fontWeight: 600,
                          cursor: submitting ? 'wait' : 'pointer', fontFamily: "'DM Sans', sans-serif",
                          opacity: submitting || uploadSongs.length === 0 ? 0.6 : 1,
                        }}>
                          {submitting ? 'Uploading...' : `Upload ${uploadSongs.length} Song${uploadSongs.length !== 1 ? 's' : ''}`}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Edit Brief Modal */}
        {editBrief && (
          <div role="presentation" style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000,
          }} onClick={() => setEditBrief(null)}>
            <div
              role="dialog" aria-label="Edit brief"
              onClick={e => e.stopPropagation()}
              style={{
                background: 'var(--surface-solid)', borderRadius: '16px 16px 0 0',
                width: '100%', maxWidth: 600, maxHeight: '90vh',
                display: 'flex', flexDirection: 'column',
                boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)',
              }}
            >
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: 17, fontWeight: 700 }}>Edit Brief</h2>
                <p style={{ fontSize: 12, color: 'var(--dim)', marginTop: 4 }}>
                  Submitted by {editBrief.user_name || 'Unknown'}{editBrief.user_email ? ` (${editBrief.user_email})` : ''}
                </p>
              </div>
              <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="grid-2col">
                    <div>
                      <label style={labelStyle}>Project Name</label>
                      <input value={editForm.project} onChange={e => setEditForm(p => ({ ...p, project: e.target.value }))} style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={labelStyle}>Brand / Client</label>
                      <input value={editForm.brand} onChange={e => setEditForm(p => ({ ...p, brand: e.target.value }))} style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={labelStyle}>Campaign Type</label>
                      <input value={editForm.campaign_type} onChange={e => setEditForm(p => ({ ...p, campaign_type: e.target.value }))} style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={labelStyle}>Deadline</label>
                      <input value={editForm.deadline} onChange={e => setEditForm(p => ({ ...p, deadline: e.target.value }))} style={{ width: '100%' }} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Creative Themes</label>
                    <textarea value={editForm.creative_themes} onChange={e => setEditForm(p => ({ ...p, creative_themes: e.target.value }))} rows={2} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Emotions / Feel</label>
                    <input value={editForm.emotions} onChange={e => setEditForm(p => ({ ...p, emotions: e.target.value }))} style={{ width: '100%' }} />
                  </div>
                  <div className="grid-2col">
                    <div>
                      <label style={labelStyle}>Genre</label>
                      <GenreTagInput value={editForm.genre} onChange={v => setEditForm(p => ({ ...p, genre: v }))} />
                    </div>
                    <div>
                      <label style={labelStyle}>Energy</label>
                      <select value={editForm.energy} onChange={e => setEditForm(p => ({ ...p, energy: e.target.value }))} style={{ width: '100%' }}>
                        <option value="">—</option>
                        {ENERGY_LEVELS.map(e => <option key={e}>{e}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Vocal Type</label>
                      <select value={editForm.vocal} onChange={e => setEditForm(p => ({ ...p, vocal: e.target.value }))} style={{ width: '100%' }}>
                        <option value="">—</option>
                        {VOCAL_TYPES.map(v => <option key={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Mood</label>
                      <input value={editForm.mood || ''} onChange={e => setEditForm(p => ({ ...p, mood: e.target.value }))} style={{ width: '100%' }} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Description / Notes</label>
                    <textarea value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} rows={3} style={{ width: '100%' }} />
                  </div>
                  <div className="grid-2col">
                    <div>
                      <label style={labelStyle}>Reference Tracks</label>
                      <input value={editForm.reference} onChange={e => setEditForm(p => ({ ...p, reference: e.target.value }))} style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={labelStyle}>Reference Artists</label>
                      <input value={editForm.reference_artists} onChange={e => setEditForm(p => ({ ...p, reference_artists: e.target.value }))} style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={labelStyle}>Contact Name</label>
                      <input value={editForm.contact_name} onChange={e => setEditForm(p => ({ ...p, contact_name: e.target.value }))} style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={labelStyle}>Contact Email</label>
                      <input value={editForm.contact_email} onChange={e => setEditForm(p => ({ ...p, contact_email: e.target.value }))} style={{ width: '100%' }} />
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setEditBrief(null)} style={{
                  padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--surface)', color: 'var(--text)', fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                }}>Cancel</button>
                <button onClick={saveEditBrief} disabled={savingEdit} style={{
                  padding: '10px 20px', borderRadius: 8, border: 'none',
                  background: 'var(--green)', color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: savingEdit ? 'wait' : 'pointer', fontFamily: "'DM Sans', sans-serif",
                  opacity: savingEdit ? 0.6 : 1,
                }}>
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        <Notification {...notif} />
      </div>
    </div>
  );
}
