import { ENERGY_MAP } from '@/lib/types';

export default function EnergyBar({ level }: { level: string }) {
  const e = ENERGY_MAP[level] || { width: 0, color: '#ccc' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 50, height: 4, background: 'rgba(0,0,0,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${e.width}%`, background: e.color, borderRadius: 2, opacity: 0.7 }} />
      </div>
      <span style={{ fontSize: 11, color: 'var(--dim)' }}>{level}</span>
    </div>
  );
}
