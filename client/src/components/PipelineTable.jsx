import React from 'react';
import { Link } from 'react-router-dom';
import StagePill from './StagePill';
import ScoreBar from './ScoreBar';
import Avatar from './Avatar';
import { formatCompactCurrency, formatRelativeTime } from '../utils/formatters';

function tierChip(t) {
  if (!t) return <span className="text-ink-4">—</span>;
  const colors = { A: '#10B981', B: '#0EA5E9', C: '#F59E0B', D: '#94A3B8' };
  return (
    <span className="inline-block w-5 h-5 rounded text-[10px] font-semibold text-white grid place-items-center" style={{ background: colors[t] || '#94A3B8' }}>{t}</span>
  );
}

export default function PipelineTable({ rows, sort, dir, onSort, onStageChange, onOpen }) {
  const Header = ({ id, children, className = '' }) => (
    <th
      className={`px-3 py-2 text-left font-medium text-xs uppercase tracking-wider text-ink-3 cursor-pointer select-none ${className}`}
      onClick={() => onSort(id)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sort === id && <span className="text-accent">{dir === 'asc' ? '↑' : '↓'}</span>}
      </span>
    </th>
  );

  return (
    <div className="bg-surface flex-1 overflow-auto">
      <table className="w-full text-sm">
        <thead className="bg-canvas border-b border-hairline sticky top-0 z-10">
          <tr>
            <Header id="fit_score" className="w-40">Score</Header>
            <Header id="name">Marina</Header>
            <Header id="state" className="w-24">State</Header>
            <Header id="slips" className="w-20 text-right">Slips</Header>
            <th className="px-3 py-2 text-right text-xs uppercase tracking-wider text-ink-3 w-20">ADR</th>
            <th className="px-3 py-2 text-center text-xs uppercase tracking-wider text-ink-3 w-12">Tier</th>
            <Header id="stage" className="w-40">Stage</Header>
            <th className="px-3 py-2 text-xs uppercase tracking-wider text-ink-3 w-20">Reviewer</th>
            <Header id="last_activity_at" className="w-28">Activity</Header>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr
              key={r.id}
              onClick={() => onOpen(r.id)}
              className="row-hover border-b border-hairline cursor-pointer"
            >
              <td className="px-3 py-2.5"><ScoreBar value={r.fit_score} /></td>
              <td className="px-3 py-2.5">
                <div className="font-medium text-ink-1">{r.name}</div>
                <div className="text-xs text-ink-3">{[r.city, r.region].filter(Boolean).join(' · ')}</div>
              </td>
              <td className="px-3 py-2.5 text-ink-2 tnum">{r.state || '—'}</td>
              <td className="px-3 py-2.5 text-right text-ink-2 font-mono tnum">{r.slips ?? '—'}</td>
              <td className="px-3 py-2.5 text-right text-ink-2 font-mono tnum">{formatCompactCurrency(r.hotel_market?.adr)}</td>
              <td className="px-3 py-2.5 text-center">{tierChip(r.hotel_market?.tier)}</td>
              <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                <StagePill stage={r.stage} onChange={(s) => onStageChange(r.id, s)} />
              </td>
              <td className="px-3 py-2.5">
                {r.reviewer_email
                  ? <Avatar user={{ name: r.reviewer_name, email: r.reviewer_email }} size={22} />
                  : <span className="text-ink-4">—</span>}
              </td>
              <td className="px-3 py-2.5 text-ink-3 text-xs">{formatRelativeTime(r.last_activity_at)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={9} className="px-4 py-12 text-center text-ink-3">No marinas match these filters.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
