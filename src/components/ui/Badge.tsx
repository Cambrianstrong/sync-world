interface BadgeProps {
  variant: 'released' | 'unreleased' | 'demo' | 'high' | 'medium' | 'low' | 'liked' | 'chosen' | 'placed' | 'none';
  children: React.ReactNode;
}

const styles: Record<string, { background: string; color: string; border?: string }> = {
  released: { background: 'rgba(5,150,105,0.08)', color: 'var(--green)', border: '1px solid rgba(5,150,105,0.15)' },
  unreleased: { background: 'rgba(26,26,46,0.05)', color: 'var(--text)', border: '1px solid rgba(26,26,46,0.1)' },
  demo: { background: 'rgba(217,119,6,0.08)', color: 'var(--orange)', border: '1px solid rgba(217,119,6,0.15)' },
  high: { background: 'rgba(220,38,38,0.06)', color: 'var(--red)' },
  medium: { background: 'rgba(217,119,6,0.06)', color: 'var(--orange)' },
  low: { background: 'rgba(107,114,128,0.06)', color: 'var(--dim)' },
  liked: { background: 'rgba(190,24,93,0.06)', color: 'var(--pink)', border: '1px solid rgba(190,24,93,0.12)' },
  chosen: { background: 'rgba(8,145,178,0.06)', color: 'var(--cyan)', border: '1px solid rgba(8,145,178,0.12)' },
  placed: { background: 'rgba(5,150,105,0.08)', color: 'var(--green)', border: '1px solid rgba(5,150,105,0.15)' },
  none: { background: 'transparent', color: 'var(--dim)' },
};

export default function Badge({ variant, children }: BadgeProps) {
  const s = styles[variant] || styles.none;
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 6,
      fontSize: 11, fontWeight: 600, letterSpacing: 0.2,
      border: s.border || '1px solid transparent',
      background: s.background, color: s.color,
    }}>
      {children}
    </span>
  );
}

export function statusBadgeVariant(status: string): BadgeProps['variant'] {
  if (status === 'Released') return 'released';
  if (status.includes('Unreleased')) return 'unreleased';
  return 'demo';
}

export function syncBadgeVariant(syncStatus: string): BadgeProps['variant'] {
  if (syncStatus === 'liked') return 'liked';
  if (syncStatus === 'chosen') return 'chosen';
  if (syncStatus === 'placed') return 'placed';
  return 'none';
}
