'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Track } from '@/lib/types';
import { ENERGY_LEVELS, VOCAL_TYPES, TRACK_STATUSES, PUBLISHERS } from '@/lib/types';
import GenreTagInput from '@/components/ui/GenreTagInput';
import SubgenreInput from '@/components/ui/SubgenreInput';
import TopNav from '@/components/nav/TopNav';
import Modal from '@/components/ui/Modal';
import DropZone from '@/components/upload/DropZone';
import Badge, { statusBadgeVariant, syncBadgeVariant } from '@/components/ui/Badge';
import Notification, { useNotification } from '@/components/ui/Notification';
import { useAuth } from '@/hooks/useAuth';

interface SongGroup {
  name: string;
  files: File[];
  // Metadata (starts with shared defaults, editable per song)
  title: string;
  artist: string;
  writers: string;
  producers: string;
  publisher: string;
  status: string;
  genre: string;
  subgenre: string;
  bpm: string;
  energy: string;
  mood: string;
  theme: string;
  vocal: string;
  key: string;
  label: string;
  splits: string;
  downloadUrl: string;
  lyrics: string;
  notes: string;
  hasMain: boolean;
  hasClean: boolean;
  hasInst: boolean;
  hasAcap: boolean;
}

function extractSongName(fileName: string): string {
  // Remove extension
  let name = fileName.replace(/\.[^.]+$/, '');
  // Remove common version suffixes
  name = name.replace(/[_\s-]*(main|clean|inst|instrumental|acap|acapella|vocal|mix|master|final|v\d+)$/i, '');
  // Remove trailing underscores/hyphens
  name = name.replace(/[_\s-]+$/, '');
  return name || fileName;
}

function detectVersions(files: File[]): { hasMain: boolean; hasClean: boolean; hasInst: boolean; hasAcap: boolean } {
  const names = files.map(f => f.name.toLowerCase());
  return {
    hasMain: names.some(n => n.includes('main')) || names.length === 1,
    hasClean: names.some(n => n.includes('clean')),
    hasInst: names.some(n => n.includes('inst')),
    hasAcap: names.some(n => n.includes('acap')),
  };
}

function formatTitle(songName: string): string {
  return songName
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

export default function UploadPage() {
  const { profile, loading: authLoading } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [step, setStep] = useState<'upload' | 'shared' | 'review'>('upload');
  const [songGroups, setSongGroups] = useState<SongGroup[]>([]);
  const [expandedSong, setExpandedSong] = useState<number | null>(null);
  const [sharedMeta, setSharedMeta] = useState({
    artist: '', writers: '', producers: '', publisher: '', status: 'Unreleased (Complete)',
    genre: '', energy: 'Medium', mood: '', theme: '', vocal: 'Male Vox',
    label: '', splits: '', notes: '',
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [myTracks, setMyTracks] = useState<Track[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [editTrack, setEditTrack] = useState<Track | null>(null);
  const [editForm, setEditForm] = useState<Partial<Track>>({});
  const [saving, setSaving] = useState(false);
  const { notif, notify } = useNotification();

  useEffect(() => {
    if (profile) {
      loadMyTracks();
      loadCategories();
    }
  }, [profile]);

  async function loadCategories() {
    const res = await fetch('/api/categories');
    const json = await res.json();
    if (json.categories) setCategories(json.categories.map((c: any) => c.name));
  }

  async function loadMyTracks() {
    const supabase = createClient();
    const query = profile?.role === 'admin'
      ? supabase.from('tracks').select('*').order('date_added', { ascending: false })
      : supabase.from('tracks').select('*').eq('submitted_by', profile!.id).order('date_added', { ascending: false });
    const { data } = await query;
    if (data) setMyTracks(data);
  }

  // Auto-group files by song name when files change
  function handleFilesChange(newFiles: File[]) {
    setFiles(newFiles);
  }

  function proceedToShared() {
    // Group files by extracted song name
    const groups: Record<string, File[]> = {};
    for (const file of files) {
      const songName = extractSongName(file.name);
      if (!groups[songName]) groups[songName] = [];
      groups[songName].push(file);
    }

    const songs: SongGroup[] = Object.entries(groups).map(([name, groupFiles]) => {
      const versions = detectVersions(groupFiles);
      return {
        name,
        files: groupFiles,
        title: formatTitle(name),
        artist: '', writers: '', producers: '', publisher: '',
        status: 'Unreleased (Complete)', genre: '', subgenre: '', bpm: '',
        energy: 'Medium', mood: '', theme: '', vocal: 'Male Vox', key: '',
        label: '', splits: '', downloadUrl: '', lyrics: '', notes: '',
        ...versions,
      };
    });

    setSongGroups(songs);
    setStep('shared');
  }

  function applySharedMeta() {
    setSongGroups(prev => prev.map(song => ({
      ...song,
      artist: song.artist || sharedMeta.artist,
      writers: song.writers || sharedMeta.writers,
      producers: song.producers || sharedMeta.producers,
      publisher: song.publisher || sharedMeta.publisher,
      status: sharedMeta.status,
      genre: sharedMeta.genre,
      energy: sharedMeta.energy,
      mood: song.mood || sharedMeta.mood,
      theme: song.theme || sharedMeta.theme,
      vocal: sharedMeta.vocal,
      label: song.label || sharedMeta.label,
      splits: song.splits || sharedMeta.splits,
      notes: song.notes || sharedMeta.notes,
    })));
    setStep('review');
  }

  function updateSong(index: number, updates: Partial<SongGroup>) {
    setSongGroups(prev => prev.map((s, i) => i === index ? { ...s, ...updates } : s));
  }

  function removeSong(index: number) {
    setSongGroups(prev => prev.filter((_, i) => i !== index));
  }

  async function submitAll() {
    setSubmitting(true);
    const supabase = createClient();
    let successCount = 0;

    for (const song of songGroups) {
      const trackData = {
        title: song.title,
        artist: song.artist,
        writers: song.writers || null,
        producers: song.producers || null,
        publisher: song.publisher || null,
        status: song.status,
        genre: song.genre,
        subgenre: song.subgenre || null,
        bpm: song.bpm ? parseInt(song.bpm) : null,
        energy: song.energy,
        mood: song.mood || null,
        theme: song.theme || null,
        vocal: song.vocal,
        key: song.key || null,
        has_main: song.hasMain,
        has_clean: song.hasClean,
        has_inst: song.hasInst,
        has_acap: song.hasAcap,
        label: song.label || null,
        splits: song.splits || 'TBD',
        download_url: song.downloadUrl || null,
        lyrics: song.lyrics || null,
        notes: song.notes || null,
        submitted_by: profile?.id || null,
      };

      const { data: track, error } = await supabase
        .from('tracks')
        .insert(trackData)
        .select()
        .single();

      if (error) {
        notify(`Error on "${song.title}": ${error.message}`, 'error');
        continue;
      }

      // Upload audio files
      for (const file of song.files) {
        const ext = file.name.split('.').pop()?.toUpperCase() || 'MP3';
        const versionType = file.name.toLowerCase().includes('clean') ? 'clean'
          : file.name.toLowerCase().includes('inst') ? 'instrumental'
          : file.name.toLowerCase().includes('acap') ? 'acapella'
          : 'main';

        const storagePath = `${track.id}/${versionType}/${file.name}`;
        const { error: uploadError } = await supabase.storage.from('tracks').upload(storagePath, file);

        if (uploadError) {
          notify(`File upload error for "${file.name}": ${uploadError.message}`, 'error');
          console.error('Storage upload error:', uploadError);
          continue;
        }

        // Register file via server API (bypasses RLS)
        const regRes = await fetch('/api/tracks/register-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            track_id: track.id,
            version_type: versionType,
            file_name: file.name,
            file_size: file.size,
            storage_path: storagePath,
            format: ext as 'WAV' | 'AIFF' | 'MP3' | 'M4A' | 'AAC' | 'FLAC' | 'OGG',
          }),
        });

        if (!regRes.ok) {
          const regErr = await regRes.json().catch(() => ({}));
          notify(`File record error for "${file.name}": ${regErr.error || 'Unknown error'}`, 'error');
          console.error('track_files register error:', regErr);
        }
      }

      await supabase.from('activity_log').insert({
        type: 'upload',
        text: `'${track.title}' submitted by ${track.artist}`,
        track_id: track.id,
        user_id: profile?.id || null,
      });

      successCount++;
    }

    notify(`${successCount} track${successCount !== 1 ? 's' : ''} submitted to catalog!`, 'success');
    setFiles([]);
    setSongGroups([]);
    setStep('upload');
    setSubmitting(false);
    loadMyTracks();
  }

  function genreCount(genre: string): number {
    return genre ? genre.split(',').map(s => s.trim()).filter(Boolean).length : 0;
  }

  function primaryGenreIsCategory(genre: string): boolean {
    if (!genre || categories.length === 0) return true; // don't block if categories haven't loaded
    const primary = genre.split(',')[0].trim();
    return categories.includes(primary);
  }

  function openEditModal(track: Track) {
    setEditTrack(track);
    setEditForm({
      title: track.title,
      artist: track.artist,
      writers: track.writers || '',
      producers: track.producers || '',
      status: track.status,
      genre: track.genre,
      subgenre: track.subgenre || '',
      bpm: track.bpm,
      energy: track.energy,
      mood: track.mood || '',
      theme: track.theme || '',
      vocal: track.vocal,
      key: track.key || '',
      label: track.label || '',
      splits: track.splits || '',
      lyrics: track.lyrics || '',
      notes: track.notes || '',
      download_url: track.download_url || '',
    });
  }

  async function saveTrackEdit() {
    if (!editTrack) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('tracks')
      .update({
        title: editForm.title,
        artist: editForm.artist,
        writers: editForm.writers || null,
        producers: editForm.producers || null,
        status: editForm.status,
        genre: editForm.genre,
        subgenre: editForm.subgenre || null,
        bpm: editForm.bpm || null,
        energy: editForm.energy,
        mood: editForm.mood || null,
        theme: editForm.theme || null,
        vocal: editForm.vocal,
        key: editForm.key || null,
        label: editForm.label || null,
        splits: editForm.splits || null,
        lyrics: editForm.lyrics || null,
        notes: editForm.notes || null,
        download_url: editForm.download_url || null,
      })
      .eq('id', editTrack.id);

    if (error) {
      notify(`Error saving: ${error.message}`, 'error');
    } else {
      notify('Track updated successfully!', 'success');
      setEditTrack(null);
      loadMyTracks();
    }
    setSaving(false);
  }

  const formGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };
  const labelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 0.3 };
  const btnStyle: React.CSSProperties = {
    padding: '10px 24px', borderRadius: 8, border: 'none',
    background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
  };
  const btnSecStyle: React.CSSProperties = {
    padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--surface)', color: 'var(--text)', fontSize: 13, fontWeight: 500,
    fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
  };

  // Steps indicator
  const steps = [
    { key: 'upload', label: '1. Upload Files' },
    { key: 'shared', label: '2. Shared Metadata' },
    { key: 'review', label: '3. Review & Submit' },
  ];

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
          Submit Music
        </h1>
        <p style={{ color: 'var(--dim)', fontSize: 14, marginBottom: 24 }}>
          Upload multiple tracks at once. Set shared metadata for the batch, then fine-tune individual songs.
        </p>

        {/* Step Indicator */}
        <div className="step-indicator" style={{ marginBottom: 32 }}>
          {steps.map((s, i) => (
            <div key={s.key} style={{
              flex: 1, padding: '12px 16px', borderRadius: 8, textAlign: 'center',
              fontSize: 13, fontWeight: 600,
              background: step === s.key ? 'var(--accent)' : 'var(--surface)',
              color: step === s.key ? '#fff' : 'var(--dim)',
              border: `1px solid ${step === s.key ? 'var(--accent)' : 'var(--border)'}`,
            }}>
              {s.label}
            </div>
          ))}
        </div>

        {/* STEP 1: Upload Files */}
        {step === 'upload' && (
          <div>
            <DropZone files={files} onFilesChange={handleFilesChange} />

            {files.length > 0 && (
              <div style={{ marginTop: 8, padding: 16, background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 8 }}>
                  <strong style={{ color: 'var(--text)' }}>{files.length} file{files.length !== 1 ? 's' : ''}</strong> detected
                  {' \u2192 '}
                  <strong style={{ color: 'var(--accent)' }}>
                    {Object.keys(files.reduce((g: Record<string, boolean>, f) => { g[extractSongName(f.name)] = true; return g; }, {})).length} song{Object.keys(files.reduce((g: Record<string, boolean>, f) => { g[extractSongName(f.name)] = true; return g; }, {})).length !== 1 ? 's' : ''}
                  </strong> auto-grouped by name
                </div>
                <div style={{ fontSize: 12, color: 'var(--dim)' }}>
                  Files are grouped by song name. Versions like _Main, _Clean, _Inst, _Acap are auto-detected.
                </div>
              </div>
            )}

            <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
              <button
                onClick={proceedToShared}
                disabled={files.length === 0}
                style={{ ...btnStyle, opacity: files.length === 0 ? 0.5 : 1, cursor: files.length === 0 ? 'not-allowed' : 'pointer' }}
              >
                Next: Set Shared Metadata
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Shared Metadata */}
        {step === 'shared' && (
          <div>
            <div style={{
              padding: 20, background: 'rgba(0,0,0,0.02)',
              border: '1px solid var(--border)', borderRadius: 12, marginBottom: 24,
            }}>
              <h3 style={{ fontSize: 15, marginBottom: 4 }}>
                Shared metadata for {songGroups.length} song{songGroups.length !== 1 ? 's' : ''}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--dim)' }}>
                These values will apply to all songs. You can override per song in the next step.
              </p>
            </div>

            <div className="grid-2col">
              <div style={formGroupStyle}>
                <label style={labelStyle}>Artist(s) *</label>
                <input value={sharedMeta.artist} onChange={e => setSharedMeta(p => ({ ...p, artist: e.target.value }))} required />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Writer(s) *</label>
                <input value={sharedMeta.writers} onChange={e => setSharedMeta(p => ({ ...p, writers: e.target.value }))} placeholder="At least one writer required" />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Producer(s)</label>
                <input value={sharedMeta.producers} onChange={e => setSharedMeta(p => ({ ...p, producers: e.target.value }))} />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Publisher *</label>
                <select value={sharedMeta.publisher} onChange={e => setSharedMeta(p => ({ ...p, publisher: e.target.value }))} required>
                  <option value="">Select Publisher...</option>
                  {PUBLISHERS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Status</label>
                <select value={sharedMeta.status} onChange={e => setSharedMeta(p => ({ ...p, status: e.target.value }))}>
                  {TRACK_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Genre(s) * <span style={{ textTransform: 'none', fontWeight: 400 }}>(min. 1 — first genre = category folder)</span></label>
                <GenreTagInput value={sharedMeta.genre} onChange={v => setSharedMeta(p => ({ ...p, genre: v }))} placeholder="First genre = category folder, then add more..." />
                {genreCount(sharedMeta.genre) >= 1 && !primaryGenreIsCategory(sharedMeta.genre) && (
                  <span style={{ fontSize: 11, color: 'var(--red)' }}>
                    First genre &ldquo;{sharedMeta.genre.split(',')[0].trim()}&rdquo; is not an existing category. Songs will go under the first matching category.
                  </span>
                )}
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Energy Level</label>
                <select value={sharedMeta.energy} onChange={e => setSharedMeta(p => ({ ...p, energy: e.target.value }))}>
                  {ENERGY_LEVELS.map(e => <option key={e}>{e}</option>)}
                </select>
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Mood / Vibe</label>
                <input value={sharedMeta.mood} onChange={e => setSharedMeta(p => ({ ...p, mood: e.target.value }))} placeholder="e.g. Determination, Grit, Cinematic" />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Lyric Theme</label>
                <input value={sharedMeta.theme} onChange={e => setSharedMeta(p => ({ ...p, theme: e.target.value }))} placeholder="e.g. Confidence, Journey, Love" />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Vocal Type</label>
                <select value={sharedMeta.vocal} onChange={e => setSharedMeta(p => ({ ...p, vocal: e.target.value }))}>
                  {VOCAL_TYPES.map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Record Label</label>
                <input value={sharedMeta.label} onChange={e => setSharedMeta(p => ({ ...p, label: e.target.value }))} placeholder="If released" />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Splits (Writer %)</label>
                <input value={sharedMeta.splits} onChange={e => setSharedMeta(p => ({ ...p, splits: e.target.value }))} placeholder="e.g. 50/25/25 or TBD" />
              </div>
              <div style={{ ...formGroupStyle, gridColumn: 'span 2' }}>
                <label style={labelStyle}>Notes / Sync Target</label>
                <textarea value={sharedMeta.notes} onChange={e => setSharedMeta(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="e.g. Perfect for Nike FIFA campaign" />
              </div>
            </div>

            <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
              <button onClick={() => setStep('upload')} style={btnSecStyle}>Back</button>
              <button onClick={applySharedMeta} disabled={!sharedMeta.artist || !sharedMeta.publisher || genreCount(sharedMeta.genre) < 1 || !sharedMeta.writers} style={{ ...btnStyle, opacity: (!sharedMeta.artist || !sharedMeta.publisher || genreCount(sharedMeta.genre) < 1 || !sharedMeta.writers) ? 0.5 : 1 }}>
                Next: Review Songs
              </button>
              {genreCount(sharedMeta.genre) < 1 && (
                <span style={{ fontSize: 12, color: 'var(--orange)', marginLeft: 8, alignSelf: 'center' }}>
                  Please select at least 1 genre
                </span>
              )}
              {!sharedMeta.publisher && (
                <span style={{ fontSize: 12, color: 'var(--orange)', marginLeft: 8, alignSelf: 'center' }}>
                  Publisher is required
                </span>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Review & Submit */}
        {step === 'review' && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 14, color: 'var(--dim)' }}>
                Review each song below. Click to expand and edit individual details. Shared metadata has been applied.
              </p>
            </div>

            {songGroups.map((song, i) => (
              <div key={i} style={{
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
                marginBottom: 12, overflow: 'hidden',
              }}>
                {/* Song Header (always visible) */}
                <div
                  onClick={() => setExpandedSong(expandedSong === i ? null : i)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 20px', cursor: 'pointer', gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, background: 'var(--accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, color: '#fff',
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {song.artist} &middot; {song.files.length} file{song.files.length !== 1 ? 's' : ''} &middot; {song.genre}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[{ on: song.hasMain, l: 'M' }, { on: song.hasClean, l: 'C' }, { on: song.hasInst, l: 'I' }, { on: song.hasAcap, l: 'A' }].map((v, j) => (
                        <span key={j} style={{
                          width: 22, height: 22, borderRadius: 4, fontSize: 10, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: v.on ? 'rgba(5,150,105,0.08)' : 'rgba(0,0,0,0.03)',
                          color: v.on ? 'var(--green)' : 'var(--dim)',
                        }}>
                          {v.l}
                        </span>
                      ))}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); removeSong(i); }} style={{
                      background: 'none', border: 'none', color: 'var(--red)',
                      fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: '0 4px',
                    }}>
                      &times;
                    </button>
                    <span style={{ color: 'var(--dim)', fontSize: 18, transform: expandedSong === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                      &#x25BE;
                    </span>
                  </div>
                </div>

                {/* Expanded Song Details */}
                {expandedSong === i && (
                  <div style={{ padding: '0 16px 20px', borderTop: '1px solid var(--border)', overflowX: 'hidden' }}>
                    <div className="grid-2col" style={{ paddingTop: 16 }}>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Song Title *</label>
                        <input value={song.title} onChange={e => updateSong(i, { title: e.target.value })} />
                      </div>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Artist(s) *</label>
                        <input value={song.artist} onChange={e => updateSong(i, { artist: e.target.value })} />
                      </div>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Writer(s)</label>
                        <input value={song.writers} onChange={e => updateSong(i, { writers: e.target.value })} />
                      </div>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Producer(s)</label>
                        <input value={song.producers} onChange={e => updateSong(i, { producers: e.target.value })} />
                      </div>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Publisher *</label>
                        <select value={song.publisher} onChange={e => updateSong(i, { publisher: e.target.value })}>
                          <option value="">Select Publisher...</option>
                          {PUBLISHERS.map(p => <option key={p}>{p}</option>)}
                        </select>
                      </div>
                      <div style={{ ...formGroupStyle, gridColumn: 'span 2' }}>
                        <label style={labelStyle}>Genre(s) * <span style={{ textTransform: 'none', fontWeight: 400 }}>(min. 1 required)</span></label>
                        <GenreTagInput value={song.genre} onChange={v => updateSong(i, { genre: v })} />
                        {genreCount(song.genre) < 1 && (
                          <span style={{ fontSize: 11, color: 'var(--orange)' }}>
                            {genreCount(song.genre) === 0 ? 'Select at least 1 genre' : 'Select at least 1 genre'}
                          </span>
                        )}
                      </div>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Sub-Genre</label>
                        <SubgenreInput value={song.subgenre} onChange={v => updateSong(i, { subgenre: v })} placeholder="Type to see suggestions..." />
                      </div>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>BPM</label>
                        <input value={song.bpm} onChange={e => updateSong(i, { bpm: e.target.value })} type="number" min="40" max="220" />
                      </div>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Key</label>
                        <input value={song.key} onChange={e => updateSong(i, { key: e.target.value })} placeholder="e.g. Am, C#" />
                      </div>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Energy Level</label>
                        <select value={song.energy} onChange={e => updateSong(i, { energy: e.target.value })}>
                          {ENERGY_LEVELS.map(e => <option key={e}>{e}</option>)}
                        </select>
                      </div>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Mood / Vibe</label>
                        <input value={song.mood} onChange={e => updateSong(i, { mood: e.target.value })} placeholder="e.g. Determination, Grit" />
                      </div>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Lyric Theme</label>
                        <input value={song.theme} onChange={e => updateSong(i, { theme: e.target.value })} placeholder="e.g. Confidence, Journey" />
                      </div>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Vocal Type</label>
                        <select value={song.vocal} onChange={e => updateSong(i, { vocal: e.target.value })}>
                          {VOCAL_TYPES.map(v => <option key={v}>{v}</option>)}
                        </select>
                      </div>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Download Link</label>
                        <input value={song.downloadUrl} onChange={e => updateSong(i, { downloadUrl: e.target.value })} placeholder="DISCO, Google Drive, Box URL" />
                      </div>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Splits</label>
                        <input value={song.splits} onChange={e => updateSong(i, { splits: e.target.value })} placeholder="e.g. 50/25/25 or TBD" />
                      </div>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Lyrics</label>
                        <textarea value={song.lyrics} onChange={e => updateSong(i, { lyrics: e.target.value })} rows={3} placeholder="Paste lyrics (optional)" />
                      </div>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>Notes / Sync Target</label>
                        <textarea value={song.notes} onChange={e => updateSong(i, { notes: e.target.value })} rows={3} placeholder="e.g. Perfect for FIFA campaign" />
                      </div>
                    </div>

                    {/* Files in this group */}
                    <div style={{ marginTop: 12 }}>
                      <label style={labelStyle}>Audio Files</label>
                      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {song.files.map((f, fi) => (
                          <div key={fi} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 12px', background: 'var(--bg)', borderRadius: 6, fontSize: 12,
                          }}>
                            <span>{f.name}</span>
                            <span style={{ color: 'var(--dim)' }}>{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {songGroups.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--dim)', background: 'var(--surface)', borderRadius: 12 }}>
                All songs removed. Go back to upload more files.
              </div>
            )}

            <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
              <button onClick={() => setStep('shared')} style={btnSecStyle}>Back</button>
              {(() => {
                const hasGenreIssue = songGroups.some(s => genreCount(s.genre) < 1 || !s.writers);
                const disabled = submitting || songGroups.length === 0 || hasGenreIssue;
                return (
                  <>
                    <button
                      onClick={submitAll}
                      disabled={disabled}
                      style={{
                        ...btnStyle,
                        background: 'var(--green)', color: '#fff', padding: '12px 32px',
                        opacity: disabled ? 0.5 : 1,
                        cursor: submitting ? 'wait' : disabled ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {submitting ? 'Submitting...' : `Submit ${songGroups.length} Song${songGroups.length !== 1 ? 's' : ''} to Catalog`}
                    </button>
                    {hasGenreIssue && (
                      <span style={{ fontSize: 12, color: 'var(--orange)', alignSelf: 'center' }}>
                        Each song needs at least 1 genre and a writer
                      </span>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* My Tracks */}
        {myTracks.length > 0 && (
          <div style={{ marginTop: 48 }}>
            <h2 style={{ fontSize: 18, marginBottom: 16 }}>
              {profile?.role === 'admin' ? 'All Tracks' : 'My Submissions'}
            </h2>
            <table style={{
              width: '100%', borderCollapse: 'separate', borderSpacing: 0,
              background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)',
            }}>
              <thead>
                <tr>
                  {['Title / Artist', 'Status', 'Genre', 'Sync Status', 'Date Added', ''].map(h => (
                    <th key={h} style={{
                      padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--dim)',
                      background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border)',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {myTracks.map(t => (
                  <tr key={t.id}>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontWeight: 600 }}>{t.title}</div>
                      <div style={{ color: 'var(--dim)', fontSize: 12 }}>{t.artist}</div>
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                      <Badge variant={statusBadgeVariant(t.status)}>
                        {t.status === 'Unreleased (Complete)' ? 'Unreleased' : t.status}
                      </Badge>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 14, borderBottom: '1px solid var(--border)' }}>
                      {t.genre}
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                      {t.sync_status !== 'none' ? (
                        <Badge variant={syncBadgeVariant(t.sync_status)}>
                          {t.sync_status.charAt(0).toUpperCase() + t.sync_status.slice(1)}
                        </Badge>
                      ) : (
                        <span style={{ color: 'var(--dim)', fontSize: 12 }}>&mdash;</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--dim)', borderBottom: '1px solid var(--border)' }}>
                      {t.date_added}
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                      <button onClick={() => openEditModal(t)} style={{
                        padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)',
                        background: 'var(--surface-solid)', color: 'var(--text)', fontSize: 12,
                        fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                        boxShadow: 'var(--shadow-sm)', whiteSpace: 'nowrap',
                      }}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Edit Track Modal */}
        <Modal open={!!editTrack} onClose={() => setEditTrack(null)}>
          {editTrack && (
            <div>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, marginBottom: 4 }}>
                Edit Track
              </h2>
              <p style={{ color: 'var(--dim)', fontSize: 13, marginBottom: 20 }}>
                Update the details for &ldquo;{editTrack.title}&rdquo;
              </p>
              <div className="grid-2col">
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Song Title *</label>
                  <input value={editForm.title || ''} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Artist(s) *</label>
                  <input value={editForm.artist || ''} onChange={e => setEditForm(p => ({ ...p, artist: e.target.value }))} />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Writer(s)</label>
                  <input value={editForm.writers || ''} onChange={e => setEditForm(p => ({ ...p, writers: e.target.value }))} />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Producer(s)</label>
                  <input value={editForm.producers || ''} onChange={e => setEditForm(p => ({ ...p, producers: e.target.value }))} />
                </div>
                <div style={{ ...formGroupStyle, gridColumn: 'span 2' }}>
                  <label style={labelStyle}>Genre(s) * <span style={{ textTransform: 'none', fontWeight: 400 }}>(min. 1 required)</span></label>
                  <GenreTagInput value={editForm.genre || ''} onChange={v => setEditForm(p => ({ ...p, genre: v }))} />
                  {genreCount(editForm.genre || '') < 1 && (
                    <span style={{ fontSize: 11, color: 'var(--orange)' }}>
                      {genreCount(editForm.genre || '') === 0 ? 'Select at least 1 genre' : 'Select at least 1 genre'}
                    </span>
                  )}
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Sub-Genre</label>
                  <SubgenreInput value={editForm.subgenre || ''} onChange={v => setEditForm(p => ({ ...p, subgenre: v }))} />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Status</label>
                  <select value={editForm.status || ''} onChange={e => setEditForm(p => ({ ...p, status: e.target.value as Track['status'] }))}>
                    {TRACK_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>BPM</label>
                  <input value={editForm.bpm || ''} onChange={e => setEditForm(p => ({ ...p, bpm: e.target.value ? parseInt(e.target.value) : null }))} type="number" min="40" max="220" />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Key</label>
                  <input value={editForm.key || ''} onChange={e => setEditForm(p => ({ ...p, key: e.target.value }))} placeholder="e.g. Am, C#" />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Energy Level</label>
                  <select value={editForm.energy || ''} onChange={e => setEditForm(p => ({ ...p, energy: e.target.value as Track['energy'] }))}>
                    {ENERGY_LEVELS.map(e => <option key={e}>{e}</option>)}
                  </select>
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Mood / Vibe</label>
                  <input value={editForm.mood || ''} onChange={e => setEditForm(p => ({ ...p, mood: e.target.value }))} />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Lyric Theme</label>
                  <input value={editForm.theme || ''} onChange={e => setEditForm(p => ({ ...p, theme: e.target.value }))} />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Vocal Type</label>
                  <select value={editForm.vocal || ''} onChange={e => setEditForm(p => ({ ...p, vocal: e.target.value as Track['vocal'] }))}>
                    {VOCAL_TYPES.map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Record Label</label>
                  <input value={editForm.label || ''} onChange={e => setEditForm(p => ({ ...p, label: e.target.value }))} />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Splits</label>
                  <input value={editForm.splits || ''} onChange={e => setEditForm(p => ({ ...p, splits: e.target.value }))} />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Download Link</label>
                  <input value={editForm.download_url || ''} onChange={e => setEditForm(p => ({ ...p, download_url: e.target.value }))} placeholder="DISCO, Google Drive, Box URL" />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Lyrics</label>
                  <textarea value={editForm.lyrics || ''} onChange={e => setEditForm(p => ({ ...p, lyrics: e.target.value }))} rows={3} />
                </div>
                <div style={{ ...formGroupStyle, gridColumn: 'span 2' }}>
                  <label style={labelStyle}>Notes / Sync Target</label>
                  <textarea value={editForm.notes || ''} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
                </div>
              </div>
              <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                <button
                  onClick={saveTrackEdit}
                  disabled={saving || !editForm.title || !editForm.artist || genreCount(editForm.genre || '') < 1}
                  style={{
                    ...btnStyle,
                    opacity: (saving || !editForm.title || !editForm.artist || genreCount(editForm.genre || '') < 1) ? 0.5 : 1,
                  }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button onClick={() => setEditTrack(null)} style={btnSecStyle}>Cancel</button>
              </div>
            </div>
          )}
        </Modal>

        <Notification {...notif} />
      </div>
    </div>
  );
}
