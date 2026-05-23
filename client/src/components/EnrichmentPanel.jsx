import React, { useState } from 'react';
import { enrichMarina } from '../utils/api';
import { ENRICHABLE_STAGES } from '../utils/stages';
import { formatRelativeTime, formatCompactCurrency } from '../utils/formatters';

const SOURCE_META = {
  regrid:    { label: 'Regrid (Parcel)', est_cents: 5  },
  airroi:    { label: 'AirROI (STR Market)', est_cents: 5 },
  airdna:    { label: 'AirDNA (Rentalizer)', est_cents: 30 },
  valuation: { label: 'Property Valuation', est_cents: 15 }
};

export default function EnrichmentPanel({ marina, onUpdated }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const enrichable = ENRICHABLE_STAGES.has(marina.stage);
  const totalCost = Object.values(SOURCE_META).reduce((a, s) => a + s.est_cents, 0);

  async function run({ force = false } = {}) {
    setError(null);
    setBusy(true);
    try {
      const result = await enrichMarina(marina.id, { force });
      onUpdated(result);
    } catch (e) {
      setError(e.body?.error || e.message);
    } finally {
      setBusy(false);
    }
  }

  const existing = Object.fromEntries((marina.enrichments || []).map(e => [e.source, e]));
  const anyDone = (marina.enrichments || []).some(e => e.status === 'ok');

  return (
    <div className="border border-hairline rounded-lg bg-surface">
      <div className="flex items-center justify-between px-4 py-3 border-b border-hairline">
        <div>
          <h3 className="font-semibold text-ink-1">Data Enrichment</h3>
          <p className="text-xs text-ink-3 mt-0.5">
            {enrichable
              ? `On-click only. Estimated ~$${(totalCost / 100).toFixed(2)} per marina.`
              : 'Mark this marina Interested or further to unlock enrichment.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {anyDone && (
            <button
              onClick={() => run({ force: true })}
              disabled={busy || !enrichable}
              className="px-3 py-1.5 text-xs border border-hairline rounded text-ink-2 hover:bg-muted disabled:opacity-40"
            >Refresh</button>
          )}
          <button
            onClick={() => run({ force: false })}
            disabled={busy || !enrichable}
            className="px-4 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? 'Enriching…' : anyDone ? 'Run again' : 'Run Enrichment'}
          </button>
        </div>
      </div>

      {error && <div className="px-4 py-2 text-sm text-red-600 bg-red-50 border-b border-red-100">{error}</div>}

      <div className="divide-y divide-hairline">
        {Object.entries(SOURCE_META).map(([source, meta]) => {
          const e = existing[source];
          return (
            <SourceRow key={source} source={source} meta={meta} entry={e} />
          );
        })}
      </div>
    </div>
  );
}

function SourceRow({ source, meta, entry }) {
  const [expanded, setExpanded] = useState(false);
  const status = entry?.status || 'pending';
  const fetched = entry?.fetched_at;
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusDot status={status} />
          <div>
            <div className="text-sm font-medium text-ink-1">{meta.label}</div>
            <div className="text-[11px] text-ink-3">
              {status === 'ok'      && `Fetched ${formatRelativeTime(fetched)}`}
              {status === 'skipped' && (entry?.error_message || 'Not configured')}
              {status === 'error'   && (entry?.error_message || 'Failed')}
              {status === 'pending' && 'Not run yet'}
              {' · '}~${(meta.est_cents / 100).toFixed(2)} per call
            </div>
          </div>
        </div>
        {entry?.data && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-xs text-accent hover:text-accent-hover"
          >{expanded ? 'Hide' : 'View'}</button>
        )}
      </div>
      {expanded && entry?.data && (
        <pre className="mt-2 p-2 bg-canvas border border-hairline rounded text-[11px] font-mono text-ink-2 overflow-auto max-h-64">{JSON.stringify(entry.data, null, 2)}</pre>
      )}
    </div>
  );
}

function StatusDot({ status }) {
  const color = status === 'ok' ? '#10B981' : status === 'error' ? '#EF4444' : status === 'skipped' ? '#F59E0B' : '#CBD2DC';
  return <span className="w-2 h-2 rounded-full" style={{ background: color }} />;
}
