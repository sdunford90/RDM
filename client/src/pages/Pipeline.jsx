import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePipeline } from '../hooks/usePipeline';
import { useKeyboard } from '../hooks/useKeyboard';
import { fetchMapboxToken } from '../utils/api';
import FiltersBar from '../components/FiltersBar';
import PipelineTable from '../components/PipelineTable';
import MarinaCardList from '../components/MarinaCardList';
import KanbanBoard from '../components/KanbanBoard';
import MarinaDrawer from '../components/MarinaDrawer';
import { useIsNarrow } from '../hooks/useMediaQuery';

export default function Pipeline() {
  const [view, setView] = useState('table');
  const [openId, setOpenId] = useState(null);
  const [mapboxToken, setMapboxToken] = useState(null);
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const narrow = useIsNarrow();
  const { filters, updateFilter, reset, data, stats, loading, setStage, refresh } = usePipeline();

  useEffect(() => { fetchMapboxToken().then(setMapboxToken).catch(() => {}); }, []);

  // Initialize selected from URL ?marina=
  useEffect(() => {
    const id = params.get('marina');
    if (id) setOpenId(id);
  }, [params]);

  const onSort = (id) => {
    if (filters.sort === id) updateFilter({ dir: filters.dir === 'asc' ? 'desc' : 'asc' });
    else updateFilter({ sort: id, dir: 'desc' });
  };

  const onOpen = (id) => {
    setOpenId(id);
    const next = new URLSearchParams(params); next.set('marina', id); setParams(next, { replace: true });
  };
  const onClose = () => {
    setOpenId(null);
    const next = new URLSearchParams(params); next.delete('marina'); setParams(next, { replace: true });
  };

  useKeyboard({
    t: () => nav(`/triage?${new URLSearchParams(filtersToParams(filters)).toString()}`),
    '/': () => document.querySelector('input[type=search]')?.focus()
  }, [filters]);

  const totals = stats.totals || { total: 0, reviewed: 0, interested: 0 };
  const reviewedPct = totals.total ? Math.round((totals.reviewed / totals.total) * 100) : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header strip */}
      <div className="px-3 md:px-5 py-2 md:py-2.5 bg-surface border-b border-hairline flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setView('table')}
            className={`px-2.5 py-1 text-xs rounded ${view === 'table' ? 'bg-ink-1 text-white' : 'bg-canvas text-ink-2 border border-hairline'}`}
          >{narrow ? 'List' : 'Table'}</button>
          <button
            onClick={() => setView('board')}
            className={`px-2.5 py-1 text-xs rounded ${view === 'board' ? 'bg-ink-1 text-white' : 'bg-canvas text-ink-2 border border-hairline'}`}
          >Board</button>
        </div>

        <div className="flex-1 min-w-[140px] max-w-md">
          <div className="flex items-center justify-between text-[11px] text-ink-3 mb-1">
            <span className="truncate">{totals.reviewed.toLocaleString()} reviewed · {totals.interested.toLocaleString()} active</span>
            <span className="tnum flex-shrink-0">{reviewedPct}% of {totals.total.toLocaleString()}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-accent transition-all" style={{ width: `${reviewedPct}%` }} />
          </div>
        </div>

        <button
          onClick={() => nav(`/triage?${new URLSearchParams(filtersToParams(filters)).toString()}`)}
          className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-hover flex items-center gap-1.5"
          title="Triage (T)"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          <span className="hidden sm:inline">Triage Mode</span>
          <span className="sm:hidden">Triage</span>
          {!narrow && <kbd className="ml-1">T</kbd>}
        </button>
      </div>

      <FiltersBar filters={filters} onChange={updateFilter} onReset={reset} total={data.total} />

      {loading && data.results.length === 0 ? (
        <div className="flex-1 grid place-items-center text-ink-3">Loading…</div>
      ) : view === 'table' ? (
        narrow ? (
          <MarinaCardList
            rows={data.results}
            onStageChange={setStage}
            onOpen={onOpen}
          />
        ) : (
          <PipelineTable
            rows={data.results}
            sort={filters.sort}
            dir={filters.dir}
            onSort={onSort}
            onStageChange={setStage}
            onOpen={onOpen}
          />
        )
      ) : (
        <KanbanBoard
          rows={data.results}
          stats={stats}
          onStageChange={setStage}
          onOpen={onOpen}
        />
      )}

      {view === 'table' && data.total > data.results.length && (
        <div className="px-5 py-2 border-t border-hairline bg-surface text-xs text-ink-3 text-center">
          Showing top {data.results.length} of {data.total.toLocaleString()}. Apply filters to narrow.
        </div>
      )}

      {openId && (
        <MarinaDrawer
          marinaId={openId}
          mapboxToken={mapboxToken}
          onClose={onClose}
          onChanged={refresh}
        />
      )}
    </div>
  );
}

function filtersToParams(f) {
  const out = {};
  for (const [k, v] of Object.entries(f)) {
    if (v !== '' && v !== 0 && v !== null && v !== undefined) out[k] = v;
  }
  return out;
}
