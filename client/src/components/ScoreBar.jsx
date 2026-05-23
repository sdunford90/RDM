import React from 'react';

function scoreColor(s) {
  if (s >= 75) return '#10B981';
  if (s >= 55) return '#0EA5E9';
  if (s >= 35) return '#F59E0B';
  return '#94A3B8';
}

export default function ScoreBar({ value, showNumber = true, width = 96 }) {
  const v = Math.max(0, Math.min(100, value || 0));
  const c = scoreColor(v);
  return (
    <div className="inline-flex items-center gap-2" title={`Fit score ${v}/100`}>
      <div className="relative bg-muted rounded-full overflow-hidden" style={{ width, height: 6 }}>
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${v}%`, background: c }} />
      </div>
      {showNumber && <span className="font-mono tnum text-sm text-ink-1 w-8 text-right">{v}</span>}
    </div>
  );
}
