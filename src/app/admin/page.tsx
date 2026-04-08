'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Track, ActivityItem } from '@/lib/types';
import { GENRES, ENERGY_LEVELS, VOCAL_TYPES, TRACK_STATUSES, PUBLISHERS } from '@/lib/types';
import TopNav from '@/components/nav/TopNav';
import GenreTagInput from '@/components/ui/GenreTagInput';
import SubgenreInput from '@/components/ui/SubgenreInput';
import StatCard from '@/components/ui/StatCard';
import Badge, { statusBadgeVariant, syncBadgeVariant } from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Notification, { useNotification } from '@/components/ui/Notification';
import { useAuth } from '@/hooks/useAuth';
import { useAudio } from '@/contexts/AudioContext';
import { PlayIcon, PauseIcon, LoadingIcon } from '@/components/ui/Icons';
import Link from 'next/link';

export default function AdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [musicRequests, setMusicRequests] = useState<any[]>([]);
  const [editTrack, setEditTrack] = useState<Track | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string | boolean | number | null>>({});
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string; color: string; sort_order: number }[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('');
  const [showCatManager, setShowCatManager] = useState(false);
  const [trackSearch, setTrackSearch] = useState('');
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeStatus, setAnalyzeStatus] = useState<string>('');

  async function analyzeTracks(onlyUntagged: boolean) {
    const targets = tracks.filter((t: any) => onlyUntagged ? !t.ai_analyzed_at : true);
    if (targets.length === 0) { alert('No tracks to analyze.'); return; }
    if (!confirm(`Queue ${targets.length} track(s) for AI analysis? This drains the queue in batches.`)) return;
    setAnalyzing(true);
    let totalOk = 0, totalFailed = 0;

    // 1. Enqueue every target track
    setAnalyzeStatus(`Queueing ${targets.length} tracks…`);
    for (const t of targets) {
      try {
        await fetch('/api/tracks/enqueue-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trackId: t.id }),
        });
      } catch (e) { console.warn('enqueue failed', t.title, e); }
    }

    // 2. Drain the queue in batches by hitting the cron endpoint repeatedly
    let safety = 20;
    while (safety-- > 0) {
      setAnalyzeStatus(`Processing queue… (${totalOk} done, ${totalFailed} failed)`);
      const res = await fetch('/api/cron/process-analysis-queue', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { console.error('drain failed', data); break; }
      totalOk += data.ok || 0;
      totalFailed += data.failed || 0;
      if ((data.drained || 0) === 0) break;
      if (data.errors?.length) console.warn('batch errors:', data.errors);
    }

    setAnalyzeStatus('');
    setAnalyzing(false);
    alert(`Done. ${totalOk} tagged, ${totalFailed} failed. Reload to see tags.`);
  }
  const { notif, notify } = useNotification();
  const { track: currentTrack, playing, loading: audioLoading, play, pause } = useAudio();

  useEffect(() => {
    loadData();
    loadCategories();
    // Auto health check — fixes ghost tracks, orphan records, unlinked files
    fetch('/api/tracks/health', { method: 'POST' })
      .then(r => r.json())
      .then(json => {
        if (json.fixed > 0) {
          const parts = [];
          if (json.ghostTracksDeleted?.length) parts.push(`${json.ghostTracksDeleted.length} ghost track(s) cleaned`);
          if (json.orphanRecordsDeleted?.length) parts.push(`${json.orphanRecordsDeleted.length} broken record(s) removed`);
          if (json.unlinkedFilesLinked?.length) parts.push(`${json.unlinkedFilesLinked.length} file(s) re-linked`);
          notify(`Auto-fix: ${parts.join(', ')}`, 'success');
          loadData(); // reload to reflect changes
        }
      })
      .catch(() => {});
  }, []);

  async function loadCategories() {
    const res = await fetch('/api/categories');
    const json = await res.json();
    if (json.categories) setCategories(json.categories);
  }

  async function addCategory() {
    if (!newCatName.trim()) return;
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCatName.trim(), color: newCatColor || undefined }),
    });
    const json = await res.json();
    if (json.error) {
      notify(`Error: ${json.error}`, 'error');
    } else {
      notify(`Category "${newCatName.trim()}" created`, 'success');
      setNewCatName('');
      setNewCatColor('');
      loadCategories();
    }
  }

  async function deleteCategory(id: string, name: string) {
    if (!confirm(`Remove "${name}" category? Tracks won't be deleted, they just won't have a category box.`)) return;
    const res = await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.error) {
      notify(`Error: ${json.error}`, 'error');
    } else {
      notify(`Category "${name}" removed`, 'info');
      loadCategories();
    }
  }

  async function loadData() {
    const supabase = createClient();
    const [tracksRes, activityRes, requestsRes] = await Promise.all([
      supabase.from('tracks').select('*').order('date_added', { ascending: false }),
      supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('music_requests').select('*').order('created_at', { ascending: false }).limit(20),
    ]);
    if (tracksRes.data) setTracks(tracksRes.data);
    if (activityRes.data) setActivity(activityRes.data);
    if (requestsRes.data) setMusicRequests(requestsRes.data);
  }

  async function updateSyncStatus(trackId: string, status: string) {
    const supabase = createClient();
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    await supabase.from('tracks').update({ sync_status: status }).eq('id', trackId);

    await supabase.from('activity_log').insert({
      type: status === 'placed' ? 'placed' : 'interest',
      text: `'${track.title}' status updated to ${status}`,
      track_id: trackId,
      user_id: profile?.id || null,
    });

    notify(`"${track.title}" updated to ${status}`, 'info');
    loadData();
  }

  function openEdit(track: Track) {
    setEditTrack(track);
    setEditForm({
      title: track.title,
      artist: track.artist,
      writers: track.writers || '',
      producers: track.producers || '',
      status: track.status,
      genre: track.genre,
      subgenre: track.subgenre || '',
      bpm: track.bpm || '',
      energy: track.energy,
      mood: track.mood || '',
      theme: track.theme || '',
      vocal: track.vocal,
      key: track.key || '',
      has_main: track.has_main,
      has_clean: track.has_clean,
      has_inst: track.has_inst,
      has_acap: track.has_acap,
      label: track.label || '',
      splits: track.splits || '',
      priority: track.priority,
      seasonal: track.seasonal || '',
      download_url: track.download_url || '',
      lyrics: track.lyrics || '',
      notes: track.notes || '',
    });
  }

  async function saveEdit() {
    if (!editTrack) return;
    setSaving(true);
    const supabase = createClient();

    const updates = {
      title: editForm.title as string,
      artist: editForm.artist as string,
      writers: (editForm.writers as string) || null,
      producers: (editForm.producers as string) || null,
      publisher: (editForm.publisher as string) || null,
      status: editForm.status as string,
      genre: editForm.genre as string,
      subgenre: (editForm.subgenre as string) || null,
      bpm: editForm.bpm ? parseInt(editForm.bpm as string) : null,
      energy: editForm.energy as string,
      mood: (editForm.mood as string) || null,
      theme: (editForm.theme as string) || null,
      vocal: editForm.vocal as string,
      key: (editForm.key as string) || null,
      has_main: editForm.has_main as boolean,
      has_clean: editForm.has_clean as boolean,
      has_inst: editForm.has_inst as boolean,
      has_acap: editForm.has_acap as boolean,
      label: (editForm.label as string) || null,
      splits: (editForm.splits as string) || null,
      priority: editForm.priority as string,
      seasonal: (editForm.seasonal as string) || null,
      download_url: (editForm.download_url as string) || null,
      lyrics: (editForm.lyrics as string) || null,
      notes: (editForm.notes as string) || null,
    };

    const { error } = await supabase.from('tracks').update(updates).eq('id', editTrack.id);

    if (error) {
      notify(`Error: ${error.message}`, 'error');
    } else {
      notify(`"${updates.title}" updated`, 'success');
      setEditTrack(null);
      loadData();
    }
    setSaving(false);
  }

  async function deleteTrack(trackId: string) {
    const track = tracks.find(t => t.id === trackId);
    if (!track || !confirm(`Delete "${track.title}" permanently? This cannot be undone.`)) return;
    await doDelete([trackId]);
  }

  async function doDelete(trackIds: string[]) {
    try {
      const res = await fetch('/api/tracks/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackIds }),
      });
      const json = await res.json();

      if (!res.ok) {
        notify(`Error deleting: ${json.error}`, 'error');
      } else {
        notify(`${json.deleted} track${json.deleted !== 1 ? 's' : ''} deleted`, 'info');
      }
    } catch (err) {
      notify('Delete failed. Please try again.', 'error');
    }
    setEditTrack(null);
    setSelectedTracks(new Set());
    loadData();
  }

  async function deleteSelected() {
    if (selectedTracks.size === 0) return;
    const names = tracks.filter(t => selectedTracks.has(t.id)).map(t => t.title);
    if (!confirm(`Delete ${names.length} track${names.length !== 1 ? 's' : ''} permanently?\n\n${names.join(', ')}\n\nThis cannot be undone.`)) return;
    await doDelete([...selectedTracks]);
  }

  async function repairTracks() {
    notify('Running health check...', 'success');
    const res = await fetch('/api/tracks/health', { method: 'POST' });
    const json = await res.json();
    if (json.fixed > 0) {
      const parts = [];
      if (json.ghostTracksDeleted?.length) parts.push(`${json.ghostTracksDeleted.length} ghost track(s) cleaned`);
      if (json.orphanRecordsDeleted?.length) parts.push(`${json.orphanRecordsDeleted.length} broken record(s) removed`);
      if (json.unlinkedFilesLinked?.length) parts.push(`${json.unlinkedFilesLinked.length} file(s) re-linked`);
      notify(parts.join(', '), 'success');
      loadData();
    } else if (json.healthy) {
      notify('All tracks healthy — nothing to fix.', 'success');
    } else if (json.errors?.length) {
      notify(`Health check found issues: ${json.errors[0]}`, 'error');
    }
  }

  function toggleSelect(trackId: string) {
    setSelectedTracks(prev => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedTracks.size === filteredTracks.length) {
      setSelectedTracks(new Set());
    } else {
      setSelectedTracks(new Set(filteredTracks.map(t => t.id)));
    }
  }

  const updateField = (field: string, value: string | boolean | number) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const filteredTracks = useMemo(() => {
    if (!trackSearch) return tracks;
    const q = trackSearch.toLowerCase();
    return tracks.filter(t =>
      `${t.title} ${t.artist} ${t.genre} ${t.id} ${t.mood} ${t.writers} ${t.producers}`.toLowerCase().includes(q)
    );
  }, [tracks, trackSearch]);

  async function handlePlay(track: Track) {
    if (currentTrack?.id === track.id && playing) { pause(); return; }
    await play(track);
  }

  const totalDownloads = tracks.reduce((s, t) => s + t.download_count, 0);
  const liked = tracks.filter(t => t.sync_status === 'liked').length;
  const chosen = tracks.filter(t => t.sync_status === 'chosen').length;
  const placed = tracks.filter(t => t.sync_status === 'placed').length;

  const activityColors: Record<string, string> = {
    download: 'var(--orange)', interest: 'var(--pink)',
    placed: 'var(--green)', upload: 'var(--accent)', submission: 'var(--cyan)',
  };

  const thStyle: React.CSSProperties = {
    padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--dim)',
    background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border)',
  };
  const tdStyle: React.CSSProperties = {
    padding: '12px 14px', fontSize: 14, borderBottom: '1px solid var(--border)', verticalAlign: 'middle',
  };
  const formGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };
  const labelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 0.3 };

  if (authLoading || !profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <p style={{ color: 'var(--dim)', fontSize: 14 }}>Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <TopNav role={profile?.role} userName={profile?.full_name} />
      <div className="page-container">
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
          Admin Dashboard
        </h1>
        <p style={{ color: 'var(--dim)', fontSize: 14, marginBottom: 28 }}>
          Track downloads, interest signals, placements, and manage the full catalog pipeline.
        </p>

        {/* Stats */}
        <div className="grid-stats" style={{ marginBottom: 28 }}>
          <StatCard label="Total Catalog" value={tracks.length} color="var(--accent)" />
          <StatCard label="Total Downloads" value={totalDownloads} color="var(--orange)" />
          <StatCard label="Liked" value={liked} color="var(--pink)" />
          <StatCard label="Chosen" value={chosen} color="var(--cyan)" />
          <StatCard label="Placed" value={placed} color="var(--green)" />
          <StatCard label="Open Briefs" value={musicRequests.filter(r => (r.status || 'Open') === 'Open').length} color="var(--green)" />
          <StatCard label="In Review" value={musicRequests.filter(r => r.status === 'In Review').length} color="var(--orange)" />
        </div>

        {/* Quick links */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <Link href="/admin/submissions" style={{
            padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--surface)', color: 'var(--text)', textDecoration: 'none',
            fontSize: 13, fontWeight: 500,
          }}>
            Manage Submissions
          </Link>
          <Link href="/admin/invites" style={{
            padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--surface)', color: 'var(--text)', textDecoration: 'none',
            fontSize: 13, fontWeight: 500,
          }}>
            Invite Links
          </Link>
          <Link href="/admin/contacts" style={{
            padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--surface)', color: 'var(--text)', textDecoration: 'none',
            fontSize: 13, fontWeight: 500,
          }}>
            Manage Contacts
          </Link>
        </div>

        {/* Category Manager */}
        <div style={{
          marginBottom: 28, padding: 20, background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showCatManager ? 16 : 0 }}>
            <div>
              <h2 style={{ fontSize: 16, marginBottom: 2 }}>Browse Categories</h2>
              <p style={{ fontSize: 12, color: 'var(--dim)' }}>
                {categories.length} categories &mdash; These are the genre folders shown on the Browse page
              </p>
            </div>
            <button
              onClick={() => setShowCatManager(!showCatManager)}
              style={{
                padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--surface-solid)', color: 'var(--text)', fontSize: 12,
                fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {showCatManager ? 'Close' : 'Manage'}
            </button>
          </div>

          {showCatManager && (
            <>
              {/* Existing categories */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {categories.map(cat => (
                  <div key={cat.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 14px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--bg)',
                    fontSize: 13, fontWeight: 500,
                  }}>
                    <span style={{
                      width: 14, height: 14, borderRadius: 4,
                      background: cat.color, flexShrink: 0,
                    }} />
                    {cat.name}
                    <button
                      onClick={() => deleteCategory(cat.id, cat.name)}
                      style={{
                        background: 'none', border: 'none', color: 'var(--red)',
                        fontSize: 16, cursor: 'pointer', lineHeight: 1, padding: '0 2px',
                      }}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>

              {/* Add new category */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 0.3, display: 'block', marginBottom: 4 }}>
                    New Category Name
                  </label>
                  <input
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    placeholder="e.g. Reggae, Soul, Funk..."
                    style={{ width: '100%' }}
                    onKeyDown={e => e.key === 'Enter' && addCategory()}
                  />
                </div>
                <button
                  onClick={addCategory}
                  disabled={!newCatName.trim()}
                  style={{
                    padding: '10px 20px', borderRadius: 8, border: 'none',
                    background: 'var(--accent)', color: '#fff', fontSize: 13,
                    fontWeight: 600, cursor: newCatName.trim() ? 'pointer' : 'not-allowed',
                    fontFamily: "'DM Sans', sans-serif",
                    opacity: newCatName.trim() ? 1 : 0.5,
                    whiteSpace: 'nowrap',
                  }}
                >
                  + Add Category
                </button>
              </div>
            </>
          )}
        </div>

        {/* Music Requests */}
        {musicRequests.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 16, marginBottom: 14 }}>
              Music Requests
              <span style={{ fontSize: 12, color: 'var(--dim)', fontWeight: 400, marginLeft: 8 }}>
                ({musicRequests.length})
              </span>
            </h2>
            {/* Desktop table */}
            <div className="table-scroll pipeline-desktop">
              <table style={{
                width: '100%', borderCollapse: 'separate', borderSpacing: 0,
                background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)',
              }}>
                <thead>
                  <tr>
                    <th style={thStyle}>From</th>
                    <th style={thStyle}>Genre</th>
                    <th style={thStyle}>Mood / Energy</th>
                    <th style={thStyle}>Project</th>
                    <th style={thStyle}>Deadline</th>
                    <th style={thStyle}>Description</th>
                    <th style={thStyle}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {musicRequests.map((r: any) => (
                    <tr key={r.id}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{r.user_name || 'Unknown'}</div>
                        <div style={{ color: 'var(--dim)', fontSize: 11 }}>{r.user_email}</div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontSize: 13 }}>{r.genre || '\u2014'}</div>
                        {r.subgenre && <div style={{ color: 'var(--dim)', fontSize: 11 }}>{r.subgenre}</div>}
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontSize: 13 }}>
                          {[r.mood, r.energy].filter(Boolean).join(' / ') || '\u2014'}
                        </div>
                        {r.vocal && <div style={{ color: 'var(--dim)', fontSize: 11 }}>{r.vocal}</div>}
                      </td>
                      <td style={{ ...tdStyle, fontSize: 13 }}>{r.project || '\u2014'}</td>
                      <td style={{ ...tdStyle, fontSize: 13 }}>{r.deadline || '\u2014'}</td>
                      <td style={{ ...tdStyle, fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.description || r.reference || '\u2014'}
                      </td>
                      <td style={{ ...tdStyle, fontSize: 12, color: 'var(--dim)' }}>
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="pipeline-mobile">
              {musicRequests.map((r: any) => (
                <div key={r.id} style={{
                  background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)',
                  padding: 14, marginBottom: 10,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{r.user_name || 'Unknown'}</div>
                      <div style={{ color: 'var(--dim)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.user_email}</div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--dim)', flexShrink: 0, marginLeft: 8 }}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    {r.genre && <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: 'rgba(99,102,241,0.1)', color: 'var(--accent)' }}>{r.genre}{r.subgenre ? ` / ${r.subgenre}` : ''}</span>}
                    {(r.mood || r.energy) && <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 6, background: 'rgba(0,0,0,0.04)', color: 'var(--dim)' }}>{[r.mood, r.energy].filter(Boolean).join(' / ')}</span>}
                    {r.vocal && <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 6, background: 'rgba(0,0,0,0.04)', color: 'var(--dim)' }}>{r.vocal}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--dim)', marginBottom: 6, flexWrap: 'wrap' }}>
                    {r.project && <span><strong style={{ color: 'var(--text)' }}>Project:</strong> {r.project}</span>}
                    {r.deadline && <span><strong style={{ color: 'var(--text)' }}>Deadline:</strong> {r.deadline}</span>}
                  </div>
                  {(r.description || r.reference) && (
                    <div style={{ fontSize: 12, color: 'var(--dim)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                      {r.description || r.reference}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="admin-layout">
          {/* Pipeline Table */}
          <div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h2 style={{ fontSize: 16, margin: 0 }}>
                  Catalog Pipeline
                  <span style={{ fontSize: 12, color: 'var(--dim)', fontWeight: 400, marginLeft: 8 }}>
                    ({filteredTracks.length}{trackSearch ? ` of ${tracks.length}` : ''})
                  </span>
                </h2>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  value={trackSearch}
                  onChange={e => setTrackSearch(e.target.value)}
                  placeholder="Search tracks..."
                  style={{ padding: '8px 14px', borderRadius: 8, fontSize: 13, flex: 1, minWidth: 0 }}
                />
                <button onClick={repairTracks} style={{
                  padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--dim)', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  Repair
                </button>
                <button
                  onClick={() => analyzeTracks(true)}
                  disabled={analyzing}
                  style={{
                    padding: '8px 14px', borderRadius: 8, border: '1px solid #6366f1',
                    background: analyzing ? 'transparent' : '#6366f1',
                    color: analyzing ? '#6366f1' : '#fff', fontSize: 12, fontWeight: 600,
                    cursor: analyzing ? 'wait' : 'pointer', fontFamily: "'DM Sans', sans-serif",
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  {analyzing ? (analyzeStatus || 'Analyzing…') : 'Analyze AI'}
                </button>
                {selectedTracks.size > 0 && (
                  <button onClick={deleteSelected} style={{
                    padding: '8px 14px', borderRadius: 8, border: '1px solid var(--red)',
                    background: 'transparent', color: 'var(--red)', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    Delete {selectedTracks.size}
                  </button>
                )}
              </div>
            </div>
            {/* Desktop table */}
            <div className="table-scroll pipeline-desktop">
            <table style={{
              width: '100%', borderCollapse: 'separate', borderSpacing: 0,
              background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)',
            }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: 36 }}>
                    <input type="checkbox" checked={selectedTracks.size === filteredTracks.length && filteredTracks.length > 0} onChange={toggleSelectAll} />
                  </th>
                  <th style={{ ...thStyle, width: 50 }}>Play</th>
                  <th style={thStyle}>Title / Artist</th>
                  <th style={thStyle}>Genre</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Downloads</th>
                  <th style={thStyle}>Sync Status</th>
                  <th style={thStyle}>Update</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTracks.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ ...tdStyle, textAlign: 'center', color: 'var(--dim)', padding: 40 }}>
                      {trackSearch ? 'No tracks match your search' : 'No tracks in catalog'}
                    </td>
                  </tr>
                ) : filteredTracks.map(t => (
                  <tr key={t.id} style={{ background: selectedTracks.has(t.id) ? 'rgba(99,102,241,0.06)' : undefined }}>
                    <td style={tdStyle}>
                      <input type="checkbox" checked={selectedTracks.has(t.id)} onChange={() => toggleSelect(t.id)} />
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => handlePlay(t)}
                        disabled={audioLoading && currentTrack?.id === t.id}
                        style={{
                          width: 32, height: 32, borderRadius: '50%', border: 'none',
                          background: currentTrack?.id === t.id && playing ? 'var(--green)' : 'var(--accent)',
                          color: '#fff', fontSize: 12, cursor: (audioLoading && currentTrack?.id === t.id) ? 'wait' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {(audioLoading && currentTrack?.id === t.id) ? <LoadingIcon size={12} color="#fff" /> : (currentTrack?.id === t.id && playing) ? <PauseIcon size={12} color="#fff" /> : <PlayIcon size={12} color="#fff" />}
                      </button>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600 }}>{t.title}</div>
                      <div style={{ color: 'var(--dim)', fontSize: 12 }}>{t.artist}</div>
                      {(t.mood || t.bpm || t.ai_tags?.energy != null) && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                          {t.mood && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 8, background: 'rgba(99,102,241,0.15)', color: '#818cf8', textTransform: 'uppercase', letterSpacing: 0.3 }}>{t.mood}</span>}
                          {t.bpm && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 8, background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>{t.bpm} BPM</span>}
                          {t.ai_tags?.energy != null && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 8, background: 'rgba(251,146,60,0.12)', color: '#fb923c' }}>E {Math.round((t.ai_tags.energy as number) * 100)}</span>}
                        </div>
                      )}
                    </td>
                    <td style={{ ...tdStyle, fontSize: 12 }}>{t.genre || '\u2014'}</td>
                    <td style={tdStyle}>
                      <Badge variant={statusBadgeVariant(t.status)}>
                        {t.status === 'Unreleased (Complete)' ? 'Unreleased' : t.status}
                      </Badge>
                    </td>
                    <td style={{
                      ...tdStyle, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
                      color: t.download_count > 0 ? 'var(--orange)' : 'var(--dim)',
                    }}>
                      {t.download_count}
                    </td>
                    <td style={tdStyle}>
                      {t.sync_status !== 'none' ? (
                        <Badge variant={syncBadgeVariant(t.sync_status)}>
                          {t.sync_status.charAt(0).toUpperCase() + t.sync_status.slice(1)}
                        </Badge>
                      ) : (
                        <span style={{ color: 'var(--dim)', fontSize: 12 }}>&mdash;</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <select
                        value={t.sync_status}
                        onChange={e => updateSyncStatus(t.id, e.target.value)}
                        style={{
                          padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)',
                          background: 'var(--bg)', color: 'var(--text)', fontSize: 12,
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        <option value="none">None</option>
                        <option value="liked">Liked</option>
                        <option value="chosen">Chosen</option>
                        <option value="placed">Placed</option>
                      </select>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(t)} style={{
                          padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)',
                          background: 'rgba(0,0,0,0.02)', color: 'var(--text)', fontSize: 12,
                          cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                        }}>
                          Edit
                        </button>
                        <button onClick={() => deleteTrack(t.id)} style={{
                          padding: '6px 12px', borderRadius: 6, border: '1px solid var(--red)',
                          background: 'transparent', color: 'var(--red)', fontSize: 12,
                          cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                        }}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            {/* Mobile cards */}
            <div className="pipeline-mobile">
              {filteredTracks.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--dim)', fontSize: 13, padding: 40, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  {trackSearch ? 'No tracks match your search' : 'No tracks in catalog'}
                </div>
              ) : filteredTracks.map(t => (
                <div key={t.id} style={{
                  background: selectedTracks.has(t.id) ? 'rgba(99,102,241,0.06)' : 'var(--surface)',
                  borderRadius: 12, border: selectedTracks.has(t.id) ? '1px solid rgba(99,102,241,0.3)' : '1px solid var(--border)',
                  padding: 14, marginBottom: 10, position: 'relative' as const,
                }}>
                  {/* Select button top-right */}
                  <button onClick={() => toggleSelect(t.id)} style={{
                    position: 'absolute' as const, top: 10, right: 10,
                    padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                    border: selectedTracks.has(t.id) ? '1px solid #6366f1' : '1px solid var(--border)',
                    background: selectedTracks.has(t.id) ? '#6366f1' : 'transparent',
                    color: selectedTracks.has(t.id) ? '#fff' : 'var(--dim)',
                  }}>
                    {selectedTracks.has(t.id) ? 'Selected' : 'Select'}
                  </button>
                  {/* Title */}
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2, marginRight: 65 }}>{t.title}</div>
                  <div style={{ color: 'var(--dim)', fontSize: 12, marginBottom: 10 }}>{t.artist}</div>
                  {/* AI tags row */}
                  {(t.ai_analyzed_at || t.bpm || t.mood) && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                      {t.mood && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 10,
                          background: 'rgba(99,102,241,0.15)', color: '#818cf8', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                          {t.mood}
                        </span>
                      )}
                      {t.bpm && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 10,
                          background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
                          {t.bpm} BPM
                        </span>
                      )}
                      {t.ai_tags?.energy != null && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 10,
                          background: 'rgba(251,146,60,0.12)', color: '#fb923c' }}>
                          Energy {Math.round((t.ai_tags.energy as number) * 100)}
                        </span>
                      )}
                      {t.ai_tags?.key && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 10,
                          background: 'rgba(148,163,184,0.15)', color: 'var(--dim)' }}>
                          {t.ai_tags.key}
                        </span>
                      )}
                    </div>
                  )}
                  {/* Badges */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
                    <Badge variant={statusBadgeVariant(t.status)}>
                      {t.status === 'Unreleased (Complete)' ? 'Unreleased' : t.status}
                    </Badge>
                    <span style={{ fontSize: 12, color: 'var(--dim)' }}>{t.genre || 'No genre'}</span>
                    {t.sync_status !== 'none' && (
                      <Badge variant={syncBadgeVariant(t.sync_status)}>
                        {t.sync_status.charAt(0).toUpperCase() + t.sync_status.slice(1)}
                      </Badge>
                    )}
                    <span style={{
                      fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
                      color: t.download_count > 0 ? 'var(--orange)' : 'var(--dim)',
                    }}>
                      {t.download_count} DLs
                    </span>
                  </div>
                  {/* Sync dropdown */}
                  <select
                    value={t.sync_status}
                    onChange={e => updateSyncStatus(t.id, e.target.value)}
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
                      background: 'var(--bg)', color: 'var(--text)', fontSize: 13,
                      fontFamily: "'DM Sans', sans-serif", marginBottom: 10,
                    }}
                  >
                    <option value="none">Sync: None</option>
                    <option value="liked">Sync: Liked</option>
                    <option value="chosen">Sync: Chosen</option>
                    <option value="placed">Sync: Placed</option>
                  </select>
                  {/* Actions row */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handlePlay(t)}
                      disabled={audioLoading && currentTrack?.id === t.id}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
                        background: currentTrack?.id === t.id && playing ? 'var(--green)' : '#6366f1',
                        color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {(audioLoading && currentTrack?.id === t.id) ? '...' : (currentTrack?.id === t.id && playing) ? 'Pause' : 'Play'}
                    </button>
                    <button onClick={() => openEdit(t)} style={{
                      flex: 1, padding: '8px 0', borderRadius: 8, border: '1px solid var(--border)',
                      background: 'transparent', color: 'var(--text)', fontSize: 13, fontWeight: 500,
                      cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                    }}>
                      Edit
                    </button>
                    <button onClick={() => deleteTrack(t.id)} style={{
                      flex: 1, padding: '8px 0', borderRadius: 8, border: '1px solid var(--red)',
                      background: 'transparent', color: 'var(--red)', fontSize: 13, fontWeight: 500,
                      cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                    }}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Feed */}
          <div>
            <h2 style={{ fontSize: 16, marginBottom: 14 }}>Activity Feed</h2>
            <ul style={{ listStyle: 'none' }}>
              {activity.length === 0 ? (
                <li style={{ padding: '12px 16px', color: 'var(--dim)', fontSize: 13 }}>No activity yet</li>
              ) : (
                activity.map(a => (
                  <li key={a.id} style={{
                    padding: '12px 16px', borderLeft: `3px solid ${activityColors[a.type] || 'var(--border)'}`,
                    marginBottom: 8, background: 'var(--surface)', borderRadius: '0 8px 8px 0', fontSize: 13,
                  }}>
                    <span>{a.text}</span>
                    <span style={{ color: 'var(--dim)', fontSize: 11, display: 'block', marginTop: 4 }}>
                      {new Date(a.created_at).toLocaleString()}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        {/* Edit Track Modal */}
        <Modal open={!!editTrack} onClose={() => setEditTrack(null)}>
          {editTrack && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22 }}>
                  Edit Track
                </h2>
                <span style={{ fontSize: 12, color: 'var(--dim)', background: 'rgba(0,0,0,0.02)', padding: '4px 10px', borderRadius: 6 }}>
                  {editTrack.id}
                </span>
              </div>
              <p style={{ color: 'var(--dim)', fontSize: 14, marginBottom: 20 }}>
                Update catalog details for corrections and metadata changes.
              </p>

              <div className="grid-2col">
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Song Title *</label>
                  <input value={editForm.title as string} onChange={e => updateField('title', e.target.value)} />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Artist(s) *</label>
                  <input value={editForm.artist as string} onChange={e => updateField('artist', e.target.value)} />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Writer(s)</label>
                  <input value={editForm.writers as string} onChange={e => updateField('writers', e.target.value)} />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Producer(s)</label>
                  <input value={editForm.producers as string} onChange={e => updateField('producers', e.target.value)} />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Publisher</label>
                  <select value={editForm.publisher as string || ''} onChange={e => updateField('publisher', e.target.value)}>
                    <option value="">None</option>
                    {PUBLISHERS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Status</label>
                  <select value={editForm.status as string} onChange={e => updateField('status', e.target.value)}>
                    {TRACK_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Genre</label>
                  <GenreTagInput value={editForm.genre as string || ''} onChange={v => updateField('genre', v)} placeholder="Select genres..." />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Sub-Genre</label>
                  <SubgenreInput value={editForm.subgenre as string || ''} onChange={v => updateField('subgenre', v)} placeholder="e.g. Trap, Neo-Soul" />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>BPM</label>
                  <input value={editForm.bpm as string} onChange={e => updateField('bpm', e.target.value)} type="number" min="40" max="220" />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Energy Level</label>
                  <select value={editForm.energy as string} onChange={e => updateField('energy', e.target.value)}>
                    {ENERGY_LEVELS.map(e => <option key={e}>{e}</option>)}
                  </select>
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Mood / Vibe</label>
                  <input value={editForm.mood as string} onChange={e => updateField('mood', e.target.value)} />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Lyric Theme</label>
                  <input value={editForm.theme as string} onChange={e => updateField('theme', e.target.value)} />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Vocal Type</label>
                  <select value={editForm.vocal as string} onChange={e => updateField('vocal', e.target.value)}>
                    {VOCAL_TYPES.map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Key</label>
                  <input value={editForm.key as string} onChange={e => updateField('key', e.target.value)} placeholder="e.g. Am, C#" />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Record Label</label>
                  <input value={editForm.label as string} onChange={e => updateField('label', e.target.value)} />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Splits (Writer %)</label>
                  <input value={editForm.splits as string} onChange={e => updateField('splits', e.target.value)} />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Priority</label>
                  <select value={editForm.priority as string} onChange={e => updateField('priority', e.target.value)}>
                    <option>High</option><option>Medium</option><option>Low</option>
                  </select>
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Seasonal Fit</label>
                  <input value={editForm.seasonal as string} onChange={e => updateField('seasonal', e.target.value)} placeholder="e.g. Summer, Year-Round" />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Download Link</label>
                  <input value={editForm.download_url as string} onChange={e => updateField('download_url', e.target.value)} placeholder="DISCO, Drive, Box URL" />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Versions Available</label>
                  <div style={{ display: 'flex', gap: 14, marginTop: 6, flexWrap: 'wrap' }}>
                    {[
                      { field: 'has_main', label: 'Main' },
                      { field: 'has_clean', label: 'Clean' },
                      { field: 'has_inst', label: 'Instrumental' },
                      { field: 'has_acap', label: 'Acapella' },
                    ].map(v => (
                      <label key={v.field} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text)' }}>
                        <input type="checkbox" checked={editForm[v.field] as boolean} onChange={e => updateField(v.field, e.target.checked)} /> {v.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Lyrics</label>
                  <textarea value={editForm.lyrics as string} onChange={e => updateField('lyrics', e.target.value)} rows={3} />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Notes / Sync Target</label>
                  <textarea value={editForm.notes as string} onChange={e => updateField('notes', e.target.value)} rows={3} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)', justifyContent: 'space-between' }}>
                <button onClick={() => deleteTrack(editTrack.id)} style={{
                  padding: '10px 20px', borderRadius: 8, border: '1px solid var(--red)',
                  background: 'transparent', color: 'var(--red)', fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                }}>
                  Delete Track
                </button>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => setEditTrack(null)} style={{
                    padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'var(--surface)', color: 'var(--text)', fontSize: 13, fontWeight: 500,
                    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                  }}>
                    Cancel
                  </button>
                  <button onClick={saveEdit} disabled={saving} style={{
                    padding: '10px 24px', borderRadius: 8, border: 'none',
                    background: 'var(--green)', color: '#fff', fontSize: 13, fontWeight: 600,
                    cursor: saving ? 'wait' : 'pointer', fontFamily: "'DM Sans', sans-serif",
                    opacity: saving ? 0.7 : 1,
                  }}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </>
          )}
        </Modal>

        <Notification {...notif} />
      </div>
    </div>
  );
}
