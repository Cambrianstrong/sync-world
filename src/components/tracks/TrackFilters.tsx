'use client';

import { GENRES, ENERGY_LEVELS, VOCAL_TYPES } from '@/lib/types';

interface TrackFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  genre: string;
  onGenreChange: (v: string) => void;
  energy: string;
  onEnergyChange: (v: string) => void;
  vocal: string;
  onVocalChange: (v: string) => void;
  writerProducer: string;
  onWriterProducerChange: (v: string) => void;
  writerProducerOptions: string[];
}

export default function TrackFilters(props: TrackFiltersProps) {
  const selectStyle: React.CSSProperties = {
    padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)',
    background: 'var(--surface-solid)', color: 'var(--text)', fontFamily: "'DM Sans', sans-serif", fontSize: 13,
    boxShadow: 'var(--shadow-sm)',
  };

  return (
    <div className="filter-row" style={{ marginBottom: 20 }}>
      <input
        style={{
          flex: 1, minWidth: 200, padding: '10px 16px', borderRadius: 10,
          border: '1px solid var(--border)', background: 'var(--surface-solid)', color: 'var(--text)',
          fontFamily: "'DM Sans', sans-serif", fontSize: 14, boxShadow: 'var(--shadow-sm)',
        }}
        type="text"
        placeholder="Search by title, artist, genre, mood, theme..."
        value={props.search}
        onChange={e => props.onSearchChange(e.target.value)}
      />
      <select style={selectStyle} value={props.status} onChange={e => props.onStatusChange(e.target.value)}>
        <option value="">All Statuses</option>
        <option>Released</option>
        <option>Unreleased (Complete)</option>
        <option>Demo (WIP)</option>
      </select>
      <select style={selectStyle} value={props.genre} onChange={e => props.onGenreChange(e.target.value)}>
        <option value="">All Genres</option>
        {GENRES.map(g => <option key={g}>{g}</option>)}
      </select>
      <select style={selectStyle} value={props.energy} onChange={e => props.onEnergyChange(e.target.value)}>
        <option value="">All Energy</option>
        {ENERGY_LEVELS.map(e => <option key={e}>{e}</option>)}
      </select>
      <select style={selectStyle} value={props.vocal} onChange={e => props.onVocalChange(e.target.value)}>
        <option value="">All Vocals</option>
        {VOCAL_TYPES.map(v => <option key={v}>{v}</option>)}
      </select>
      <select style={selectStyle} value={props.writerProducer} onChange={e => props.onWriterProducerChange(e.target.value)}>
        <option value="">All Writers/Producers</option>
        {props.writerProducerOptions.map(wp => <option key={wp}>{wp}</option>)}
      </select>
    </div>
  );
}
