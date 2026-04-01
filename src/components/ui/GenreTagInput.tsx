'use client';

import { useState, useRef, useMemo } from 'react';
import { GENRES } from '@/lib/types';

const ALL_SUGGESTIONS = [
  ...GENRES,
  'Trap', 'Drill', 'Boom Bap', 'Lo-Fi', 'Neo-Soul', 'Funk',
  'Reggaeton', 'Dancehall', 'Amapiano', 'Grime', 'UK Garage',
  'Soul', 'Blues', 'Indie', 'Alternative', 'Punk', 'Metal',
  'Classical', 'Cinematic', 'Ambient', 'House', 'Techno',
  'Drum & Bass', 'Dubstep', 'Future Bass', 'Synthwave', 'Disco',
  'Bossa Nova', 'Samba', 'Cumbia', 'Salsa', 'Bachata',
  'K-Pop', 'J-Pop', 'Afro-Fusion', 'Highlife', 'Zouk',
  'Worship', 'CCM', 'Hymn', 'Choral',
  'Acoustic', 'Singer-Songwriter', 'Folk',
];

const SUGGESTIONS = [...new Set(ALL_SUGGESTIONS)].sort();

interface GenreTagInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function GenreTagInput({ value, onChange, placeholder }: GenreTagInputProps) {
  const [input, setInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(() => {
    return value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];
  }, [value]);

  const filtered = useMemo(() => {
    if (!input) return SUGGESTIONS.filter(s => !selected.includes(s)).slice(0, 10);
    const q = input.toLowerCase();
    return SUGGESTIONS
      .filter(s => s.toLowerCase().includes(q) && !selected.includes(s))
      .slice(0, 10);
  }, [input, selected]);

  function addGenre(genre: string) {
    const trimmed = genre.trim();
    if (!trimmed || selected.includes(trimmed)) return;
    const next = [...selected, trimmed];
    onChange(next.join(', '));
    setInput('');
    inputRef.current?.focus();
  }

  function removeGenre(genre: string) {
    const next = selected.filter(g => g !== genre);
    onChange(next.join(', '));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      addGenre(input);
    } else if (e.key === 'Backspace' && !input && selected.length > 0) {
      removeGenre(selected[selected.length - 1]);
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 6, padding: '6px 10px',
        border: '1px solid var(--border)', borderRadius: 10,
        background: 'var(--surface-solid)', minHeight: 40, alignItems: 'center',
        cursor: 'text', boxShadow: 'var(--shadow-sm)',
      }} onClick={() => inputRef.current?.focus()}>
        {selected.map(g => (
          <span key={g} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
            background: 'var(--accent-light)', color: 'var(--text)',
            border: '1px solid var(--border)',
            fontFamily: "'DM Sans', sans-serif",
          }}>
            {g}
            <button onClick={(e) => { e.stopPropagation(); removeGenre(g); }} style={{
              background: 'none', border: 'none', color: 'var(--dim)',
              cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0, marginLeft: 2,
            }}>
              &times;
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={e => { setInput(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={selected.length === 0 ? (placeholder || 'Type to add genres...') : ''}
          style={{
            flex: 1, minWidth: 80, border: 'none', outline: 'none',
            background: 'transparent', color: 'var(--text)',
            fontFamily: "'DM Sans', sans-serif", fontSize: 13, padding: '2px 0',
            boxShadow: 'none',
          }}
        />
      </div>
      {showDropdown && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
          background: 'var(--surface-solid)', border: '1px solid var(--border)',
          borderRadius: 10, marginTop: 4, maxHeight: 200, overflowY: 'auto',
          boxShadow: 'var(--shadow)',
        }}>
          {filtered.map(g => (
            <button key={g} onMouseDown={(e) => { e.preventDefault(); addGenre(g); }} style={{
              display: 'block', width: '100%', padding: '8px 14px', border: 'none',
              background: 'transparent', color: 'var(--text)', fontSize: 13,
              fontFamily: "'DM Sans', sans-serif", cursor: 'pointer', textAlign: 'left',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {g}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
