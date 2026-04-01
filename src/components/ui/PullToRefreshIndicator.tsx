'use client';

interface Props {
  pullDistance: number;
  refreshing: boolean;
  threshold?: number;
}

export default function PullToRefreshIndicator({ pullDistance, refreshing, threshold = 80 }: Props) {
  if (pullDistance <= 0 && !refreshing) return null;

  const progress = Math.min(pullDistance / threshold, 1);
  const ready = progress >= 1;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: pullDistance,
      overflow: 'hidden',
      transition: refreshing ? 'none' : 'height 0.2s ease',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        opacity: Math.min(progress * 1.5, 1),
        transform: `scale(${0.6 + progress * 0.4})`,
        transition: 'transform 0.15s ease',
      }}>
        <div style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          border: '2.5px solid var(--border)',
          borderTopColor: ready || refreshing ? 'var(--accent)' : 'var(--border)',
          animation: refreshing ? 'ptr-spin 0.8s linear infinite' : 'none',
          transform: refreshing ? 'none' : `rotate(${progress * 360}deg)`,
          transition: 'border-color 0.15s',
        }} />
        <span style={{
          fontSize: 12,
          fontWeight: 500,
          color: ready || refreshing ? 'var(--accent)' : 'var(--dim)',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {refreshing ? 'Refreshing...' : ready ? 'Release to refresh' : 'Pull to refresh'}
        </span>
      </div>
    </div>
  );
}
