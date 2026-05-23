import React from 'react';
import StagePill from './StagePill';
import ScoreBar from './ScoreBar';
import Avatar from './Avatar';
import { formatCompactCurrency, formatRelativeTime } from '../utils/formatters';

// Mobile/narrow-screen alternative to PipelineTable. Renders each marina as
// a tappable card with the same essential signal (score, name, slips, ADR,
// stage, reviewer, activity) but stacked instead of columnar.

export default function MarinaCardList({ rows, onStageChange, onOpen }) {
  if (rows.length === 0) {
    return <div className="flex-1 grid place-items-center text-ink-3 text-sm p-8 text-center">No marinas match these filters.</div>;
  }
  return (
    <div className="flex-1 overflow-y-auto bg-canvas">
      <ul className="divide-y divide-hairline">
        {rows.map(r => (
          <li
            key={r.id}
            onClick={() => onOpen(r.id)}
            className="bg-surface px-4 py-3 active:bg-muted cursor-pointer"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 pt-0.5">
                <ScoreBar value={r.fit_score} width={56} showNumber />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-ink-1 truncate">{r.name}</div>
                <div className="text-xs text-ink-3 truncate">
                  {[r.city, r.state, r.region].filter(Boolean).join(' · ')}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-2 tnum">
                  <span>{r.slips ?? '—'} slips</span>
                  {r.hotel_market?.adr && <span>·  {formatCompactCurrency(r.hotel_market.adr)} ADR</span>}
                  {r.hotel_market?.tier && <span>·  Tier {r.hotel_market.tier}</span>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <div onClick={(e) => e.stopPropagation()}>
                  <StagePill stage={r.stage} onChange={(s) => onStageChange(r.id, s)} />
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-ink-3">
                  {r.reviewer_email && <Avatar user={{ name: r.reviewer_name, email: r.reviewer_email }} size={18} />}
                  <span>{formatRelativeTime(r.last_activity_at)}</span>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
