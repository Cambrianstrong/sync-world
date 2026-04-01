interface StatCardProps {
  label: string;
  value: number | string;
  color?: string;
}

export default function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div style={{
      background: 'var(--surface-solid)', border: '1px solid var(--border)',
      borderRadius: 14, padding: 20,
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>
        {label}
      </div>
      <div style={{
        fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700,
        marginTop: 4, color: color || 'var(--text)',
      }}>
        {value}
      </div>
    </div>
  );
}
