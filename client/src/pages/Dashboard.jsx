import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { fetchDashboard } from '../utils/api';
import { STAGES, STAGES_BY_ID } from '../utils/stages';
import { formatRelativeTime } from '../utils/formatters';
import ScoreBar from '../components/ScoreBar';
import Avatar from '../components/Avatar';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const nav = useNavigate();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchDashboard()
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (!cancelled) setError(e.body?.error || e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="h-full grid place-items-center text-ink-3">Loading…</div>;
  if (error)   return <div className="h-full grid place-items-center text-red-600 text-sm p-6 text-center">{error}</div>;
  if (!data)   return null;

  const { totals, funnel, stuck, top_unreviewed, my_active, recent_activity } = data;

  return (
    <div className="h-full overflow-y-auto bg-canvas">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
        {/* Headline counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <Headline label="Total marinas"        value={totals.total} />
          <Headline label="Unreviewed"           value={totals.unreviewed}  hint="Open Triage to work through them" />
          <Headline label="Active deals"         value={totals.active}      hint="Qualified through Diligence" />
          <Headline label="Closed"               value={totals.closed} accent />
        </div>

        {/* Funnel */}
        <Card title="Pipeline funnel" hint="last 7 days">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {funnel
              .filter(s => STAGES_BY_ID[s.stage])
              .sort((a, b) => STAGES.findIndex(x => x.id === a.stage) - STAGES.findIndex(x => x.id === b.stage))
              .map(s => {
                const meta = STAGES_BY_ID[s.stage];
                const delta = (s.in_this_week || 0) - (s.out_this_week || 0);
                return (
                  <button
                    key={s.stage}
                    onClick={() => nav(`/pipeline?stage=${s.stage}`)}
                    className="text-left p-3 rounded-lg border border-hairline bg-canvas hover:border-rule hover:bg-surface transition-colors"
                  >
                    <div className="flex items-center gap-1.5 text-[11px] text-ink-3">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
                      <span className="truncate">{meta.label}</span>
                    </div>
                    <div className="mt-1 text-2xl font-semibold text-ink-1 tnum">{s.count.toLocaleString()}</div>
                    <div className="text-[11px] text-ink-3 tnum flex items-center gap-1">
                      <span>{(s.total_slips || 0).toLocaleString()} slips</span>
                      {delta !== 0 && (
                        <span className={`ml-auto font-medium ${delta > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {delta > 0 ? '+' : ''}{delta}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Top unreviewed */}
          <Card title="Top of funnel" hint="highest score, not yet reviewed" action={<Link to="/triage" className="text-xs text-accent hover:text-accent-hover">Open triage →</Link>}>
            {top_unreviewed.length === 0
              ? <EmptyRow text="Every marina has been triaged. Nice work." />
              : <MarinaRows rows={top_unreviewed} onClick={(m) => nav(`/pipeline?marina=${m.id}`)} showScore />}
          </Card>

          {/* Stuck */}
          <Card title="Needs attention" hint="active deals with no activity in 14+ days">
            {stuck.length === 0
              ? <EmptyRow text="Nothing is stuck — every active deal moved recently." />
              : <MarinaRows rows={stuck} onClick={(m) => nav(`/pipeline?marina=${m.id}`)} showStage showLastActivity />}
          </Card>

          {/* My active */}
          <Card title="Your active deals">
            {my_active.length === 0
              ? <EmptyRow text="You haven't moved any deals into an active stage yet." />
              : <MarinaRows rows={my_active} onClick={(m) => nav(`/pipeline?marina=${m.id}`)} showStage showLastActivity />}
          </Card>

          {/* Recent activity */}
          <Card title="Recent team activity">
            {recent_activity.length === 0
              ? <EmptyRow text="No activity yet." />
              : (
                <ul className="divide-y divide-hairline">
                  {recent_activity.map(a => (
                    <li key={a.id} className="py-2 flex items-center gap-2 text-sm">
                      <Avatar user={{ name: a.user_name, email: a.user_email }} size={22} />
                      <span className="text-ink-2 min-w-0 flex-1 truncate">
                        <span className="font-medium text-ink-1">{a.user_name || a.user_email || 'system'}</span>{' '}
                        {describe(a)}{' '}
                        <Link to={`/pipeline?marina=${a.marina_id}`} className="text-accent hover:text-accent-hover">{a.marina_name}</Link>
                      </span>
                      <span className="text-[11px] text-ink-3 flex-shrink-0 tnum">{formatRelativeTime(a.at)}</span>
                    </li>
                  ))}
                </ul>
              )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Headline({ label, value, hint, accent }) {
  return (
    <div className={`p-3 md:p-4 rounded-lg border border-hairline bg-surface ${accent ? 'border-l-4 border-l-accent' : ''}`}>
      <div className="text-[11px] uppercase tracking-wider text-ink-3">{label}</div>
      <div className="mt-1 text-2xl md:text-3xl font-semibold text-ink-1 tnum">{(value || 0).toLocaleString()}</div>
      {hint && <div className="text-[11px] text-ink-3 mt-0.5 truncate">{hint}</div>}
    </div>
  );
}

function Card({ title, hint, action, children }) {
  return (
    <div className="rounded-lg border border-hairline bg-surface">
      <div className="px-4 py-3 border-b border-hairline flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-ink-1 text-sm">{title}</h3>
          {hint && <p className="text-[11px] text-ink-3 mt-0.5">{hint}</p>}
        </div>
        {action}
      </div>
      <div className="p-3 md:p-4">{children}</div>
    </div>
  );
}

function EmptyRow({ text }) {
  return <div className="py-6 text-center text-sm text-ink-3 italic">{text}</div>;
}

function MarinaRows({ rows, onClick, showScore, showStage, showLastActivity }) {
  return (
    <ul className="divide-y divide-hairline">
      {rows.map(m => (
        <li
          key={m.id}
          onClick={() => onClick(m)}
          className="py-2.5 flex items-center gap-3 cursor-pointer hover:bg-muted -mx-3 px-3 md:-mx-4 md:px-4"
        >
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-ink-1 truncate">{m.name}</div>
            <div className="text-[11px] text-ink-3 truncate">{[m.city, m.state].filter(Boolean).join(', ')}{m.slips ? ` · ${m.slips} slips` : ''}</div>
          </div>
          {showStage && <StageDot stage={m.stage} />}
          {showScore && <ScoreBar value={m.fit_score} width={56} showNumber />}
          {showLastActivity && (
            <span className="text-[11px] text-ink-3 flex-shrink-0 tnum w-16 text-right">{formatRelativeTime(m.last_activity_at || m.stage_changed_at)}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function StageDot({ stage }) {
  const meta = STAGES_BY_ID[stage];
  if (!meta) return null;
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: meta.tint, color: meta.color }}>{meta.label}</span>
  );
}

function describe(a) {
  let p = {};
  try { p = JSON.parse(a.payload || '{}'); } catch { /* ignore */ }
  if (a.action === 'stage_change') {
    const from = STAGES_BY_ID[p.from]?.label || p.from;
    const to   = STAGES_BY_ID[p.to]?.label   || p.to;
    return <>moved <span className="text-ink-3">{from}</span> → <span className="text-ink-1 font-medium">{to}</span> on</>;
  }
  if (a.action === 'note')         return 'updated notes on';
  if (a.action === 'enrich')       return 'enriched';
  if (a.action === 'file_upload')  return <>uploaded <span className="text-ink-3">{p.filename}</span> to</>;
  if (a.action === 'file_delete')  return <>deleted <span className="text-ink-3">{p.filename}</span> from</>;
  if (a.action === 'underwrite_open') return 'opened underwriting on';
  return `${a.action} on`;
}
