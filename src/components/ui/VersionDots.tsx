interface VersionDotsProps {
  hasMain: boolean;
  hasClean: boolean;
  hasInst: boolean;
  hasAcap: boolean;
}

export default function VersionDots({ hasMain, hasClean, hasInst, hasAcap }: VersionDotsProps) {
  const versions = [
    { on: hasMain, label: 'Main' },
    { on: hasClean, label: 'Clean' },
    { on: hasInst, label: 'Inst' },
    { on: hasAcap, label: 'Acap' },
  ];
  return (
    <div style={{ display: 'flex', gap: 4 }} title={versions.filter(v => v.on).map(v => v.label).join(' / ')}>
      {versions.map((v, i) => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: '50%',
          background: v.on ? 'var(--green)' : 'rgba(0,0,0,0.08)',
        }} />
      ))}
    </div>
  );
}
