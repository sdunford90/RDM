import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { listMarinas, updateMarina, fetchMapboxToken } from '../utils/api';
import { useKeyboard } from '../hooks/useKeyboard';
import { TRIAGE_ACTIONS, STAGES_BY_ID } from '../utils/stages';
import { formatCompactCurrency, formatRelativeTime } from '../utils/formatters';
import ScoreBar from '../components/ScoreBar';

const PAGE_SIZE = 50;

export default function Triage() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [queue, setQueue] = useState([]);
  const [total, setTotal] = useState(0);
  const [idx, setIdx] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mapboxToken, setMapboxToken] = useState(null);
  const [sessionCount, setSessionCount] = useState(0);

  const filters = useMemo(() => {
    const o = Object.fromEntries(params);
    if (!o.stage) o.stage = 'new'; // default to unreviewed
    o.sort = o.sort || 'fit_score';
    o.dir = o.dir || 'desc';
    return o;
  }, [params]);

  const load = useCallback(async (off = 0, append = false) => {
    setLoading(true);
    try {
      const r = await listMarinas({ ...filters, limit: PAGE_SIZE, offset: off });
      setTotal(r.total);
      setQueue(prev => append ? [...prev, ...r.results] : r.results);
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { setIdx(0); setOffset(0); load(0, false); }, [load]);
  useEffect(() => { fetchMapboxToken().then(setMapboxToken).catch(() => {}); }, []);

  // Pre-fetch when near the end.
  useEffect(() => {
    if (queue.length > 0 && idx >= queue.length - 5 && queue.length < total) {
      const nextOff = offset + PAGE_SIZE;
      setOffset(nextOff);
      load(nextOff, true);
    }
  }, [idx, queue.length, total, offset, load]);

  const current = queue[idx];

  const act = useCallback(async (stage) => {
    if (!current) return;
    const id = current.id;
    setQueue(q => q.map(m => m.id === id ? { ...m, stage } : m));
    setSessionCount(c => c + 1);
    setIdx(i => i + 1);
    try { await updateMarina(id, { stage }); }
    catch (e) { console.error('Update failed:', e); }
  }, [current]);

  useKeyboard({
    i: () => act('interested'),
    m: () => act('reviewing'),
    p: () => act('passed'),
    ArrowRight: () => setIdx(i => Math.min(i + 1, queue.length - 1)),
    ArrowLeft:  () => setIdx(i => Math.max(i - 1, 0)),
    Escape:     () => nav('/pipeline'),
    Enter:      () => current && nav(`/pipeline?marina=${current.id}`)
  }, [act, queue.length, current, nav]);

  if (loading && queue.length === 0) {
    return <div className="h-full grid place-items-center text-ink-3">Loading queue…</div>;
  }
  if (!current) {
    return (
      <div className="h-full grid place-items-center text-center px-6">
        <div>
          <h2 className="text-2xl font-semibold text-ink-1 mb-2">Queue cleared 🎉</h2>
          <p className="text-ink-3 mb-6">You reviewed {sessionCount} marinas this session.</p>
          <button onClick={() => nav('/pipeline')} className="px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover">Back to pipeline</button>
        </div>
      </div>
    );
  }

  const stageMeta = STAGES_BY_ID[current.stage];

  return (
    <div className="h-full flex flex-col bg-canvas">
      {/* Progress strip */}
      <div className="px-6 py-3 bg-surface border-b border-hairline flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs text-ink-3">
          <button onClick={() => nav('/pipeline')} className="text-ink-3 hover:text-accent" title="Esc to exit">← Exit triage</button>
          <span className="text-ink-4">·</span>
          <span><span className="tnum text-ink-1 font-medium">{idx + 1}</span> of {total.toLocaleString()}</span>
          <span className="text-ink-4">·</span>
          <span><span className="tnum text-ink-1 font-medium">{sessionCount}</span> reviewed this session</span>
        </div>
        <div className="flex-1 max-w-xs">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-accent transition-all" style={{ width: `${(idx / Math.max(total, 1)) * 100}%` }} />
          </div>
        </div>
        <div className="ml-auto text-xs text-ink-3">
          Stage: <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: stageMeta.tint, color: stageMeta.color }}>{stageMeta.label}</span>
        </div>
      </div>

      {/* Hero */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-8">
          <div className="flex items-start justify-between gap-6 mb-6">
            <div className="min-w-0">
              <h1 className="text-3xl font-semibold text-ink-1 truncate">{current.name}</h1>
              <p className="text-ink-2 mt-1">{current.address || `${current.city || ''}, ${current.state || ''}`}</p>
              {current.harbor && <p className="text-sm text-ink-3 mt-0.5">Harbor: {current.harbor}</p>}
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-xs uppercase tracking-wider text-ink-3">Fit Score</div>
              <div className="mt-1 flex items-center gap-2"><ScoreBar value={current.fit_score} width={140} /></div>
            </div>
          </div>

          {current.lat && current.lon && mapboxToken && (
            <img
              className="w-full h-72 object-cover rounded-xl border border-hairline mb-6"
              alt="Location"
              src={`https://api.mapbox.com/styles/v1/mapbox/light-v11/static/pin-l-marker+0E7490(${current.lon},${current.lat})/${current.lon},${current.lat},13,0/1280x576@2x?access_token=${mapboxToken}`}
            />
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Tile label="Slips" value={current.slips ?? '—'} />
            <Tile label="Max LOA" value={current.max_loa ? `${current.max_loa} ft` : '—'} />
            <Tile label="ADR (market)" value={formatCompactCurrency(current.hotel_market?.adr)} />
            <Tile label="Tier" value={current.hotel_market?.tier_label || current.hotel_market?.tier || '—'} />
            <Tile label="Operator" value={current.operator_type || 'Private'} />
            <Tile label="Fuel" value={current.has_fuel_dock ? 'Yes' : 'No'} />
            <Tile label="Demand score" value={current.hotel_market?.demand_score ?? '—'} />
            <Tile label="Last activity" value={formatRelativeTime(current.last_activity_at) === '—' ? 'Never' : formatRelativeTime(current.last_activity_at)} />
          </div>

          {current.hotel_market?.market_name && (
            <p className="mt-4 text-xs text-ink-3">Market: {current.hotel_market.market_name} {current.hotel_market.seasonality && `· ${current.hotel_market.seasonality.replace(/_/g, ' ')}`}</p>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="border-t border-hairline bg-surface px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          {TRIAGE_ACTIONS.map(a => (
            <button
              key={a.key}
              onClick={() => act(a.stage)}
              className="flex-1 px-4 py-3 rounded-lg font-medium text-white shadow-card hover:shadow-pop transition-shadow flex items-center justify-center gap-2"
              style={{ background: a.accent }}
            >
              {a.label}
              <kbd style={{ background: 'rgba(255,255,255,0.25)', color: 'white', borderColor: 'rgba(255,255,255,0.4)' }}>{a.key.toUpperCase()}</kbd>
            </button>
          ))}
          <button onClick={() => setIdx(i => Math.min(i + 1, queue.length - 1))} className="px-4 py-3 rounded-lg border border-hairline text-ink-2 hover:bg-muted flex items-center gap-2">
            Skip <kbd>→</kbd>
          </button>
          <button onClick={() => nav(`/pipeline?marina=${current.id}`)} className="px-4 py-3 rounded-lg border border-hairline text-ink-2 hover:bg-muted flex items-center gap-2">
            Open <kbd>↵</kbd>
          </button>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value }) {
  return (
    <div className="bg-surface border border-hairline rounded-lg p-4">
      <div className="text-[11px] uppercase tracking-wider text-ink-3">{label}</div>
      <div className="mt-1 text-lg font-medium text-ink-1 tnum">{value}</div>
    </div>
  );
}
