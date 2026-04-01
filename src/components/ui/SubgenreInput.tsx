'use client';

import { useState, useRef, useMemo } from 'react';

const SUBGENRE_SUGGESTIONS = [
  'Trap', 'Drill', 'Boom Bap', 'Lo-Fi Hip-Hop', 'Conscious Rap', 'Gangsta Rap',
  'Cloud Rap', 'Mumble Rap', 'Southern Hip-Hop', 'East Coast', 'West Coast',
  'Chopped & Screwed', 'Phonk', 'Emo Rap', 'Jazz Rap', 'Trip-Hop',
  'Neo-Soul', 'Contemporary R&B', 'Quiet Storm', 'New Jack Swing', 'Alternative R&B',
  'PBR&B', 'Slow Jam',
  'Synth-Pop', 'Dance Pop', 'Electro-Pop', 'Indie Pop', 'Chamber Pop',
  'Art Pop', 'Dream Pop', 'K-Pop', 'J-Pop', 'Bubblegum Pop', 'Power Pop',
  'House', 'Deep House', 'Tech House', 'Techno', 'Drum & Bass', 'Dubstep',
  'Future Bass', 'Synthwave', 'Ambient', 'IDM', 'Breakbeat', 'UK Garage',
  'Jungle', 'Trance', 'Hardstyle', 'Downtempo', 'Chillwave',
  'Alternative Rock', 'Indie Rock', 'Post-Rock', 'Punk Rock', 'Hard Rock',
  'Psychedelic Rock', 'Garage Rock', 'Shoegaze', 'Grunge', 'Progressive Rock',
  'Reggaeton', 'Dembow', 'Latin Trap', 'Bachata', 'Salsa', 'Cumbia', 'Merengue',
  'Afrobeats', 'Amapiano', 'Afro-Fusion', 'Highlife', 'Afro-House', 'Gqom',
  'Dancehall', 'Soca', 'Zouk', 'Reggae', 'Dub',
  'Bossa Nova', 'Samba', 'Funk Carioca', 'MPB', 'Forr\u00f3',
  'Country Pop', 'Country Rock', 'Americana', 'Bluegrass', 'Outlaw Country',
  'Red Dirt', 'Nashville Sound',
  'Contemporary Worship', 'CCM', 'Gospel Choir', 'Hymn', 'Praise & Worship',
  'Smooth Jazz', 'Bebop', 'Fusion', 'Cool Jazz', 'Free Jazz', 'Acid Jazz',
  'Cinematic', 'Orchestral', 'Epic', 'Trailer Music', 'Acoustic',
  'Singer-Songwriter', 'Folk', 'Funk', 'Soul', 'Blues', 'Disco', 'Motown',
  'Grime', 'Garage', 'Ska', 'Surf Rock', 'Choral',
].sort();

interface SubgenreInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SubgenreInput({ value, onChange, placeholder }: SubgenreInputProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!value) return SUBGENRE_SUGGESTIONS.slice(0, 12);
    const q = value.toLowerCase();
    return SUBGENRE_SUGGESTIONS.filter(s => s.toLowerCase().includes(q)).slice(0, 12);
  }, [value]);

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        value={value}
        onChange={e => { onChange(e.target.value); setShowDropdown(true); }}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        placeholder={placeholder || 'Type to see suggestions...'}
        style={{ width: '100%' }}
      />
      {showDropdown && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
          background: 'var(--surface-solid)', border: '1px solid var(--border)',
          borderRadius: 10, marginTop: 4, maxHeight: 200, overflowY: 'auto',
          boxShadow: 'var(--shadow)',
        }}>
          {filtered.map(s => (
            <button key={s} onMouseDown={(e) => { e.preventDefault(); onChange(s); setShowDropdown(false); }} style={{
              display: 'block', width: '100%', padding: '8px 14px', border: 'none',
              background: 'transparent', color: 'var(--text)', fontSize: 13,
              fontFamily: "'DM Sans', sans-serif", cursor: 'pointer', textAlign: 'left',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
