'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Track } from '@/lib/types';
import { GENRES } from '@/lib/types';
import TopNav from '@/components/nav/TopNav';
import TrackFilters from '@/components/tracks/TrackFilters';
import TrackTable from '@/components/tracks/TrackTable';
import TrackDetail from '@/components/tracks/TrackDetail';

import Notification, { useNotification } from '@/components/ui/Notification';
import { CartButton } from '@/components/cart/CartPanel';
import { useAuth } from '@/hooks/useAuth';

const GENRE_COLORS: Record<string, string> = {
  'Hip-Hop': 'linear-gradient(135deg, #1a1a2e 0%, #3a3a5c 100%)',
  'R&B': 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
  'Pop': 'linear-gradient(135deg, #ec4899 0%, #f9a8d4 100%)',
  'Country': 'linear-gradient(135deg, #b45309 0%, #d97706 100%)',
  'Latin': 'linear-gradient(135deg, #dc2626 0%, #f87171 100%)',
  'Brazilian': 'linear-gradient(135deg, #059669 0%, #34d399 100%)',
  'Electronic': 'linear-gradient(135deg, #0891b2 0%, #22d3ee 100%)',
  'Afrobeats': 'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)',
  'Rock': 'linear-gradient(135deg, #374151 0%, #6b7280 100%)',
  'Gospel': 'linear-gradient(135deg, #7c2d12 0%, #c2410c 100%)',
  'Jazz': 'linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%)',
  'Orchestral': 'linear-gradient(135deg, #581c87 0%, #9333ea 100%)',
  'Other': 'linear-gradient(135deg, #4b5563 0%, #9ca3af 100%)',
};

export default function BrowsePage() {
  const { profile, loading: authLoading } = useAuth();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const [filterEnergy, setFilterEnergy] = useState('');
  const [filterVocal, setFilterVocal] = useState('');
  const [filterWriterProducer, setFilterWriterProducer] = useState('');
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [activeSection, setActiveSection] = useState<'songs' | 'instrumentals' | null>(null);
  const { notif, notify } = useNotification();

  useEffect(() => {
    loadTracks();
  }, []);

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
      return (
        (!search || s.includes(search.toLowerCase())) &&
        (!filterStatus || t.status === filterStatus) &&
        (!filterGenre || t.genre === filterGenre) &&
        (!filterEnergy || t.energy === filterEnergy) &&
        (!filterVocal || t.vocal === filterVocal) &&
        wpMatch
      );
    });
  }, [tracks, songTracks, instrumentalTracks, activeSection, search, filterStatus, filterGenre, filterEnergy, filterVocal, filterWriterProducer]);

  // Genre grouping for songs
  const songGenreGroups = useMemo(() => {
    const groups: Record<string, number> = {};
    songTracks.forEach(t => {
      groups[t.genre] = (groups[t.genre] || 0) + 1;
    });
    return groups;
  }, [songTracks]);

  // Genre grouping for instrumentals
  const instGenreGroups = useMemo(() => {
    const groups: Record<string, number> = {};
    instrumentalTracks.forEach(t => {
      groups[t.genre] = (groups[t.genre] || 0) + 1;
    });
    return groups;
  }, [instrumentalTracks]);

  // All genres for songs
  const songGenres = useMemo(() => {
    const genres: string[] = [...GENRES];
    Object.keys(songGenreGroups).forEach(g => {
      if (!genres.includes(g)) genres.push(g);
    });
    return genres;
  }, [songGenreGroups]);

  // All genres for instrumentals
  const instGenres = useMemo(() => {
    const genres: string[] = [...GENRES];
    Object.keys(instGenreGroups).forEach(g => {
      if (!genres.includes(g)) genres.push(g);
    });
    return genres;
  }, [instGenreGroups]);

  const isViewer = !profile || profile.role === 'viewer';

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

        {/* Search bar */}
        <div style={{ marginBottom: 28 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, artist, genre, mood, theme..."
            style={{ width: '100%', padding: '14px 20px', borderRadius: 14, fontSize: 15 }}
          />
        </div>

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
                {songGenres.map(genre => {
                  const count = songGenreGroups[genre] || 0;
                  return (
                    <div
                      key={`song-${genre}`}
                      className="genre-box"
                      onClick={() => { setActiveSection('songs'); setFilterGenre(genre); }}
                      style={{
                        background: GENRE_COLORS[genre] || 'linear-gradient(135deg, #4b5563 0%, #9ca3af 100%)',
                      }}
                    >
                      <div>
                        <div className="genre-box-label">{genre}</div>
                        <div className="genre-box-count">
                          {count} track{count !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                {instGenres.map(genre => {
                  const count = instGenreGroups[genre] || 0;
                  return (
                    <div
                      key={`inst-${genre}`}
                      className="genre-box"
                      onClick={() => { setActiveSection('instrumentals'); setFilterGenre(genre); }}
                      style={{
                        background: GENRE_COLORS[genre] || 'linear-gradient(135deg, #4b5563 0%, #9ca3af 100%)',
                      }}
                    >
                      <div>
                        <div className="genre-box-label">{genre}</div>
                        <div className="genre-box-count">
                          {count} track{count !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Active genre header + back button */}
        {(filterGenre || search) && (
          <div style={{ marginBottom: 20 }}>
            {filterGenre && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
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
                  {activeSection === 'instrumentals' ? `${filterGenre} (Instrumentals)` : filterGenre}
                </h2>
                <span style={{ color: 'var(--dim)', fontSize: 14 }}>
                  {filtered.length} track{filtered.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Filters */}
            <TrackFilters
              search={search} onSearchChange={setSearch}
              status={filterStatus} onStatusChange={setFilterStatus}
              genre={filterGenre} onGenreChange={setFilterGenre}
              energy={filterEnergy} onEnergyChange={setFilterEnergy}
              vocal={filterVocal} onVocalChange={setFilterVocal}
              writerProducer={filterWriterProducer} onWriterProducerChange={setFilterWriterProducer}
              writerProducerOptions={writerProducerOptions}
            />

            {/* Track Table */}
            <TrackTable
              tracks={filtered}
              onView={setSelectedTrack}
              showCart={isViewer}
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
        {isViewer && <CartButton />}
      </div>
    </div>
  );
}
