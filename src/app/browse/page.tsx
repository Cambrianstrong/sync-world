'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Track } from '@/lib/types';
import TopNav from '@/components/nav/TopNav';
import TrackTable from '@/components/tracks/TrackTable';
import TrackCardGrid from '@/components/tracks/TrackCardGrid';
import TrackDetail from '@/components/tracks/TrackDetail';

import Notification, { useNotification } from '@/components/ui/Notification';
import PullToRefreshIndicator from '@/components/ui/PullToRefreshIndicator';
import { CartButton } from '@/components/cart/CartPanel';
import { useAuth } from '@/hooks/useAuth';
import useKeyboardShortcuts from '@/hooks/useKeyboardShortcuts';
import usePullToRefresh from '@/hooks/usePullToRefresh';

interface Category {
  id: string;
  name: string;
  color: string;
  sort_order: number;
}

// Normalize a genre string for comparison — strips to lowercase alphanumeric
// so "Hip-Hop", "hip-hop", "Hip Hop", "hiphop" all become "hiphop"
function normalizeGenre(g: string): string {
  return g.toLowerCase().replace(/[^a-z0-9&]/g, '');
}

// Get the primary genre (first genre) for category box placement
function getPrimaryGenre(genre: string): string {
  if (!genre) return '';
  return genre.split(',')[0].trim();
}

// Get all genres from a comma-separated genre string
function getAllGenres(genre: string): string[] {
  if (!genre) return [];
  return genre.split(',').map(g => g.trim()).filter(Boolean);
}

// Check if a track has a specific genre anywhere in its genre tags (normalized)
function hasGenre(trackGenre: string, genre: string): boolean {
  const target = normalizeGenre(genre);
  return getAllGenres(trackGenre).some(g => normalizeGenre(g) === target);
}

const FALLBACK_COLOR = 'linear-gradient(135deg, #4b5563 0%, #9ca3af 100%)';

export default function BrowsePage() {
  const { profile, loading: authLoading } = useAuth();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const [filterEnergy, setFilterEnergy] = useState('');
  const [filterVocal, setFilterVocal] = useState('');
  const [filterWriterProducer, setFilterWriterProducer] = useState('');
  const [filterPublisher, setFilterPublisher] = useState('');
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [activeSection, setActiveSection] = useState<'songs' | 'instrumentals' | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const { notif, notify } = useNotification();
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTracks();
    loadCategories();
  }, []);

  // Listen for logo click to reset all filters
  useEffect(() => {
    function handleReset() {
      setSearch(''); setFilterStatus(''); setFilterGenre(''); setFilterEnergy('');
      setFilterVocal(''); setFilterWriterProducer(''); setFilterPublisher('');
      setActiveSection(null); setShowFilters(false); setSelectedTrack(null);
    }
    window.addEventListener('browse-reset', handleReset);
    return () => window.removeEventListener('browse-reset', handleReset);
  }, []);

  async function loadCategories() {
    const res = await fetch('/api/categories');
    const json = await res.json();
    if (json.categories) setCategories(json.categories);
  }

  async function loadTracks() {
    const supabase = createClient();
    const { data } = await supabase
      .from('tracks')
      .select('*')
      .order('date_added', { ascending: false });
    if (data) setTracks(data);
  }

  const writerProducerOptions = useMemo(() => {
    const names = new Set<string>();
    tracks.forEach(t => {
      [t.writers, t.producers].forEach(field => {
        if (field) {
          field.split(/[\/,&]/).map(n => n.trim()).filter(Boolean).forEach(n => names.add(n));
        }
      });
    });
    return [...names].sort();
  }, [tracks]);

  const publisherOptions = useMemo(() => {
    const pubs = new Set<string>();
    tracks.forEach(t => {
      if (t.publisher) {
        t.publisher.split(/[,\/]/).map(p => p.trim()).filter(Boolean).forEach(p => pubs.add(p));
      }
    });
    return [...pubs].sort();
  }, [tracks]);

  async function handleInterest(trackId: string, level: 'liked' | 'chosen' | 'placed') {
    const supabase = createClient();
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    await supabase
      .from('tracks')
      .update({ sync_status: level })
      .eq('id', trackId);

    await supabase.from('activity_log').insert({
      type: level === 'placed' ? 'placed' : 'interest',
      text: `'${track.title}' marked as ${level}`,
      track_id: trackId,
      user_id: profile?.id || null,
    });

    setSelectedTrack(null);
    notify(`"${track.title}" marked as ${level}!`, 'info');
    loadTracks();
  }

  // Split tracks into songs (vocal) and instrumentals
  const songTracks = useMemo(() => tracks.filter(t => t.vocal !== 'Instrumental'), [tracks]);
  const instrumentalTracks = useMemo(() => tracks.filter(t => t.vocal === 'Instrumental'), [tracks]);

  const filtered = useMemo(() => {
    const pool = activeSection === 'instrumentals' ? instrumentalTracks
      : activeSection === 'songs' ? songTracks
      : tracks;

    return pool.filter(t => {
      const s = `${t.title} ${t.artist} ${t.genre} ${t.subgenre} ${t.mood} ${t.theme} ${t.notes}`.toLowerCase();
      const wpMatch = !filterWriterProducer ||
        `${t.writers} ${t.producers}`.toLowerCase().includes(filterWriterProducer.toLowerCase());
      const pubMatch = !filterPublisher ||
        (t.publisher && t.publisher.toLowerCase().includes(filterPublisher.toLowerCase()));
      // Match if genre appears ANYWHERE in the track's genre tags
      const genreMatch = !filterGenre || filterGenre === '__all__' || hasGenre(t.genre, filterGenre);
      return (
        (!search || s.includes(search.toLowerCase())) &&
        (!filterStatus || t.status === filterStatus) &&
        genreMatch &&
        (!filterEnergy || t.energy === filterEnergy) &&
        (!filterVocal || t.vocal === filterVocal) &&
        wpMatch &&
        pubMatch
      );
    });
  }, [tracks, songTracks, instrumentalTracks, activeSection, search, filterStatus, filterGenre, filterEnergy, filterVocal, filterWriterProducer, filterPublisher]);

  // Genre counts: count tracks where genre appears ANYWHERE in tags
  // (a track tagged "Hip-Hop, R&B" counts toward both Hip-Hop AND R&B)
  const songGenreGroups = useMemo(() => {
    const groups: Record<string, number> = {};
    const catNames = categories.map(c => c.name);
    songTracks.forEach(t => {
      const trackGenres = getAllGenres(t.genre).map(g => normalizeGenre(g));
      catNames.forEach(cat => {
        if (trackGenres.includes(normalizeGenre(cat))) {
          groups[cat] = (groups[cat] || 0) + 1;
        }
      });
    });
    return groups;
  }, [songTracks, categories]);

  const instGenreGroups = useMemo(() => {
    const groups: Record<string, number> = {};
    const catNames = categories.map(c => c.name);
    instrumentalTracks.forEach(t => {
      const trackGenres = getAllGenres(t.genre).map(g => normalizeGenre(g));
      catNames.forEach(cat => {
        if (trackGenres.includes(normalizeGenre(cat))) {
          groups[cat] = (groups[cat] || 0) + 1;
        }
      });
    });
    return groups;
  }, [instrumentalTracks, categories]);

  const handleOpenTrack = useCallback(() => {
    if (selectedIndex >= 0 && selectedIndex < filtered.length) {
      setSelectedTrack(filtered[selectedIndex]);
    }
  }, [selectedIndex, filtered]);

  const handleCloseModal = useCallback(() => {
    setSelectedTrack(null);
    setShowShortcuts(false);
  }, []);

  const handleFocusSearch = useCallback(() => {
    searchRef.current?.focus();
  }, []);

  useKeyboardShortcuts({
    trackCount: filtered.length,
    selectedIndex,
    onSelectIndex: setSelectedIndex,
    onOpenTrack: handleOpenTrack,
    onCloseModal: handleCloseModal,
    onFocusSearch: handleFocusSearch,
  });

  const handleRefresh = useCallback(async () => {
    await Promise.all([loadTracks(), loadCategories()]);
  }, []);

  const { pullDistance, refreshing } = usePullToRefresh({ onRefresh: handleRefresh });

  const isViewer = !profile || profile.role === 'viewer';
  const canCart = profile?.role === 'viewer' || profile?.role === 'admin';

  // Show loading while checking auth — useAuth will redirect to /login if not authenticated
  if (authLoading || !profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <p style={{ color: 'var(--dim)', fontSize: 14 }}>Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <PullToRefreshIndicator pullDistance={pullDistance} refreshing={refreshing} />
      <TopNav role={profile?.role} userName={profile?.full_name} />
      <div className="page-container">

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
            Browse Catalog
          </h1>
          <p style={{ color: 'var(--dim)', fontSize: 14 }}>
            Explore music by category, preview tracks, and add to your cart for sync placement.
          </p>
        </div>

        {/* Search / Filter toggle button */}
        <div style={{ marginBottom: showFilters ? 0 : 28 }}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              width: '100%', padding: '14px 20px', borderRadius: 14, fontSize: 15,
              border: '1px solid var(--border)', background: 'var(--surface-solid)',
              color: search ? 'var(--text)' : 'var(--dim)', textAlign: 'left',
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              {search || 'Search & filter tracks...'}
            </span>
            <span style={{
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {(search || filterStatus || filterEnergy || filterVocal || filterWriterProducer || filterPublisher) && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                  background: 'var(--accent)', color: '#fff',
                }}>
                  {[search, filterStatus, filterEnergy, filterVocal, filterWriterProducer, filterPublisher].filter(Boolean).length}
                </span>
              )}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s', transform: showFilters ? 'rotate(180deg)' : 'rotate(0)' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </span>
          </button>
        </div>

        {/* Expandable search & filter panel */}
        {showFilters && (
          <div style={{
            background: 'var(--surface-solid)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 16, marginBottom: 24,
            animation: 'slideDown 0.2s ease',
          }}>
            <input
              ref={searchRef}
              value={search}
              onChange={e => { setSearch(e.target.value); setSelectedIndex(-1); }}
              placeholder="Search by title, artist, genre, mood, theme..."
              autoFocus
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 10, fontSize: 14,
                border: '1px solid var(--border)', background: 'var(--bg)',
                color: 'var(--text)', fontFamily: "'DM Sans', sans-serif",
                marginBottom: 12,
              }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
              {[
                { value: filterStatus, onChange: setFilterStatus, options: ['Released', 'Unreleased (Complete)', 'Demo (WIP)'], placeholder: 'All Statuses' },
                { value: filterEnergy, onChange: setFilterEnergy, options: ['Low', 'Medium', 'High'], placeholder: 'All Energy' },
                { value: filterVocal, onChange: setFilterVocal, options: ['Vocal', 'Instrumental', 'Both'], placeholder: 'All Vocals' },
              ].map((f, i) => (
                <select
                  key={i}
                  value={f.value}
                  onChange={e => f.onChange(e.target.value)}
                  style={{
                    padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)',
                    background: 'var(--bg)', color: 'var(--text)',
                    fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                  }}
                >
                  <option value="">{f.placeholder}</option>
                  {f.options.map(o => <option key={o}>{o}</option>)}
                </select>
              ))}
              {writerProducerOptions.length > 0 && (
                <select
                  value={filterWriterProducer}
                  onChange={e => setFilterWriterProducer(e.target.value)}
                  style={{
                    padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)',
                    background: 'var(--bg)', color: 'var(--text)',
                    fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                  }}
                >
                  <option value="">All Writers/Producers</option>
                  {writerProducerOptions.map(wp => <option key={wp}>{wp}</option>)}
                </select>
              )}
              {publisherOptions.length > 0 && (
                <select
                  value={filterPublisher}
                  onChange={e => setFilterPublisher(e.target.value)}
                  style={{
                    padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)',
                    background: 'var(--bg)', color: 'var(--text)',
                    fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                  }}
                >
                  <option value="">All Publishers</option>
                  {publisherOptions.map(p => <option key={p}>{p}</option>)}
                </select>
              )}
            </div>
            {/* Clear all button */}
            {(search || filterStatus || filterEnergy || filterVocal || filterWriterProducer || filterPublisher) && (
              <button
                onClick={() => {
                  setSearch(''); setFilterStatus(''); setFilterEnergy('');
                  setFilterVocal(''); setFilterWriterProducer(''); setFilterPublisher('');
                }}
                style={{
                  marginTop: 12, padding: '8px 16px', borderRadius: 8, border: 'none',
                  background: 'var(--red)', color: '#fff', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}

        {/* Songs & Instrumentals sections */}
        {!filterGenre && !search && (
          <>
            {/* Songs Section */}
            <div style={{ marginBottom: 40 }}>
              <h2 style={{
                fontSize: 20, fontWeight: 700, marginBottom: 16,
                fontFamily: "'Space Grotesk', sans-serif",
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                Songs
                <span style={{
                  fontSize: 12, fontWeight: 500, color: 'var(--dim)',
                  background: 'var(--surface)', padding: '4px 10px', borderRadius: 8,
                }}>
                  {songTracks.length} track{songTracks.length !== 1 ? 's' : ''}
                </span>
              </h2>
              <div className="genre-grid">
                {categories.map(cat => {
                  const count = songGenreGroups[cat.name] || 0;
                  if (count === 0) return null;
                  return (
                    <div
                      key={`song-${cat.id}`}
                      className="genre-box"
                      onClick={() => { setActiveSection('songs'); setFilterGenre(cat.name); }}
                      style={{
                        background: cat.color || FALLBACK_COLOR,
                      }}
                    >
                      <div>
                        <div className="genre-box-label">{cat.name}</div>
                        <div className="genre-box-count">
                          {count} track{count !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* View All Songs card */}
                <div
                  className="genre-box"
                  onClick={() => { setActiveSection('songs'); setFilterGenre('__all__'); }}
                  style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #4b5563 100%)' }}
                >
                  <div>
                    <div className="genre-box-label">All Songs</div>
                    <div className="genre-box-count">
                      {songTracks.length} track{songTracks.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Instrumentals Section */}
            <div style={{ marginBottom: 36 }}>
              <h2 style={{
                fontSize: 20, fontWeight: 700, marginBottom: 16,
                fontFamily: "'Space Grotesk', sans-serif",
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                Instrumentals
                <span style={{
                  fontSize: 12, fontWeight: 500, color: 'var(--dim)',
                  background: 'var(--surface)', padding: '4px 10px', borderRadius: 8,
                }}>
                  {instrumentalTracks.length} track{instrumentalTracks.length !== 1 ? 's' : ''}
                </span>
              </h2>
              <div className="genre-grid">
                {categories.map(cat => {
                  const count = instGenreGroups[cat.name] || 0;
                  if (count === 0) return null;
                  return (
                    <div
                      key={`inst-${cat.id}`}
                      className="genre-box"
                      onClick={() => { setActiveSection('instrumentals'); setFilterGenre(cat.name); }}
                      style={{
                        background: cat.color || FALLBACK_COLOR,
                      }}
                    >
                      <div>
                        <div className="genre-box-label">{cat.name}</div>
                        <div className="genre-box-count">
                          {count} track{count !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* View All Instrumentals card */}
                {instrumentalTracks.length > 0 && (
                  <div
                    className="genre-box"
                    onClick={() => { setActiveSection('instrumentals'); setFilterGenre('__all__'); }}
                    style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #4b5563 100%)' }}
                  >
                    <div>
                      <div className="genre-box-label">All Instrumentals</div>
                      <div className="genre-box-count">
                        {instrumentalTracks.length} track{instrumentalTracks.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Active genre header + back button */}
        {(filterGenre || search) && (
          <div style={{ marginBottom: 20 }}>
            {filterGenre && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <button
                  onClick={() => { setFilterGenre(''); setActiveSection(null); }}
                  style={{
                    padding: '8px 16px', borderRadius: 10, border: '1px solid var(--border)',
                    background: 'var(--surface-solid)', color: 'var(--text)', fontSize: 13,
                    fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  &larr; All Categories
                </button>
                <h2 style={{ fontSize: 20, fontWeight: 700 }}>
                  {filterGenre === '__all__'
                    ? (activeSection === 'instrumentals' ? 'All Instrumentals' : 'All Songs')
                    : (activeSection === 'instrumentals' ? `${filterGenre} (Instrumentals)` : filterGenre)}
                </h2>
                <span style={{ color: 'var(--dim)', fontSize: 14 }}>
                  {filtered.length} track{filtered.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Search results header */}
            {!filterGenre && search && (
              <div style={{ marginBottom: 16 }}>
                <span style={{ color: 'var(--dim)', fontSize: 14 }}>
                  {filtered.length} result{filtered.length !== 1 ? 's' : ''} for &ldquo;{search}&rdquo;
                </span>
              </div>
            )}

            {/* Track Cards */}
            <TrackCardGrid
              tracks={filtered}
              onView={setSelectedTrack}
              showCart={canCart}
            />
          </div>
        )}

        {/* Track Detail Modal */}
        <TrackDetail
          track={selectedTrack}
          open={!!selectedTrack}
          onClose={() => setSelectedTrack(null)}
          onInterest={isViewer ? handleInterest : undefined}
          showInterest={isViewer}
        />

        <Notification {...notif} />

        {/* Cart button for viewers */}
        {canCart && <CartButton />}

        {/* Keyboard shortcuts help button */}
        <button
          onClick={() => setShowShortcuts(true)}
          className="shortcuts-help-btn"
          title="Keyboard shortcuts"
        >
          ?
        </button>

        {/* Shortcuts overlay */}
        {showShortcuts && (
          <div className="shortcuts-overlay" onClick={() => setShowShortcuts(false)}>
            <div className="shortcuts-panel" onClick={e => e.stopPropagation()}>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, marginBottom: 16 }}>
                Keyboard Shortcuts
              </h3>
              <div style={{ display: 'grid', gap: 10 }}>
                {[
                  ['Space', 'Play / Pause'],
                  ['\u2191 \u2193', 'Navigate tracks'],
                  ['Enter', 'Open track detail'],
                  ['Esc', 'Close modal'],
                  ['Ctrl + K', 'Focus search'],
                ].map(([key, desc]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <kbd style={{
                      padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                      background: 'var(--accent-light)', border: '1px solid var(--border)',
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}>
                      {key}
                    </kbd>
                    <span style={{ fontSize: 13, color: 'var(--dim)' }}>{desc}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowShortcuts(false)}
                style={{
                  marginTop: 20, width: '100%', padding: '10px', borderRadius: 10,
                  border: '1px solid var(--border)', background: 'var(--surface-solid)',
                  color: 'var(--text)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
