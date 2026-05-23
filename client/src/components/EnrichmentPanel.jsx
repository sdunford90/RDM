import React, { useState } from 'react';
import { enrichMarina } from '../utils/api';
import { ENRICHABLE_STAGES } from '../utils/stages';
import { formatRelativeTime, formatCompactCurrency, formatNumber, formatPercent } from '../utils/formatters';

// Data-enrichment panel. We never label the underlying APIs on screen —
// the user sees the *outputs* (parcel/ownership, STR market, rentalizer,
// valuation) grouped by what they teach about the deal.

export default function EnrichmentPanel({ marina, onUpdated }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [justRan, setJustRan] = useState(false);

  const enrichable = ENRICHABLE_STAGES.has(marina.stage);
  const sources = Object.fromEntries((marina.enrichments || []).map(e => [e.source, e]));
  const dataFor = (k) => sources[k]?.status === 'ok' ? sources[k].data : null;

  const parcel    = dataFor('regrid');
  const strMarket = dataFor('airroi');
  const rentalizer = dataFor('airdna');
  const valuation = dataFor('valuation');

  const anyData = parcel || strMarket || rentalizer || valuation;
  const allSkipped = (marina.enrichments || []).length > 0 && (marina.enrichments || []).every(e => e.status === 'skipped');
  const lastRun = (marina.enrichments || []).map(e => e.fetched_at).filter(Boolean).sort().pop();

  async function run({ force = false } = {}) {
    setError(null);
    setBusy(true);
    setJustRan(false);
    try {
      await enrichMarina(marina.id, { force });
      setJustRan(true);
      await onUpdated?.();
    } catch (e) {
      setError(e.body?.error || e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-hairline rounded-lg bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 border-b border-hairline">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-ink-1">Enrichment</h3>
          <p className="text-xs text-ink-3 mt-0.5">
            {!enrichable
              ? 'Move this marina to Qualified or further to unlock enrichment.'
              : !anyData && !lastRun
                ? 'Pull parcel ownership, STR market metrics, rentalizer projections, and a valuation estimate for this address.'
                : `Last refreshed ${formatRelativeTime(lastRun)}.`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => run({ force: !!anyData })}
            disabled={busy || !enrichable}
            className="px-4 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? 'Pulling data…' : anyData ? 'Refresh' : 'Run Enrichment'}
          </button>
        </div>
      </div>

      {error && <Banner kind="error">{error}</Banner>}
      {justRan && !error && allSkipped && !anyData && (
        <Banner kind="warn">
          Enrichment ran, but no data sources returned results.
          {' '}Set <code>REGRID_API_KEY</code>, <code>AIRROI_API_KEY</code>, <code>AIRDNA_API_KEY</code>, or <code>VALUATION_PROVIDER</code> in <code>.env</code> to enable them.
        </Banner>
      )}
      {justRan && !error && anyData && (
        <Banner kind="ok">Enrichment complete.</Banner>
      )}

      {!anyData ? (
        <div className="px-4 py-6 text-center text-sm text-ink-3">
          {lastRun ? 'No data was returned on the last run.' : 'No enrichment data yet.'}
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {parcel    && <ParcelCard data={parcel} />}
          {strMarket && <STRMarketCard data={strMarket} />}
          {rentalizer && <RentalizerCard data={rentalizer} />}
          {valuation && <ValuationCard data={valuation} />}
        </div>
      )}
    </div>
  );
}

function Banner({ kind, children }) {
  const tones = {
    error: 'bg-red-50 text-red-700 border-red-100',
    warn:  'bg-amber-50 text-amber-800 border-amber-100',
    ok:    'bg-emerald-50 text-emerald-700 border-emerald-100'
  };
  return <div className={`px-4 py-2 text-xs border-b ${tones[kind] || tones.ok}`}>{children}</div>;
}

function OutputCard({ title, children }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold mb-1.5">{title}</div>
      <div className="border border-hairline rounded-lg bg-canvas p-3 grid grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-2">
        {children}
      </div>
    </div>
  );
}

function Field({ label, value }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-ink-3">{label}</div>
      <div className="text-sm text-ink-1 truncate tnum" title={String(value)}>{value}</div>
    </div>
  );
}

function ParcelCard({ data }) {
  if (!data) return null;
  const fmtCurr = v => v != null ? formatCompactCurrency(v) : null;
  return (
    <OutputCard title="Parcel & Ownership">
      <Field label="Owner" value={data.owner} />
      <Field label="APN" value={data.apn} />
      <Field label="Acreage" value={data.acreage != null ? `${formatNumber(data.acreage, 2)} ac` : null} />
      <Field label="Assessed Value" value={fmtCurr(data.assessed_value)} />
      <Field label="Land Value" value={fmtCurr(data.land_value)} />
      <Field label="Improvement Value" value={fmtCurr(data.improvement_value)} />
      <Field label="Zoning" value={data.zoning} />
      <Field label="County" value={data.county} />
      <Field label="Last Sale" value={data.last_sale_date ? `${data.last_sale_date}${data.last_sale_price ? ` · ${fmtCurr(data.last_sale_price)}` : ''}` : null} />
      <Field label="Flood Zone" value={data.flood_zone} />
    </OutputCard>
  );
}

function STRMarketCard({ data }) {
  if (!data) return null;
  return (
    <OutputCard title="Short-Term Rental Market">
      <Field label="Avg Daily Rate" value={data.avg_daily_rate != null ? formatCompactCurrency(data.avg_daily_rate) : null} />
      <Field label="Occupancy" value={data.avg_occupancy != null ? formatPercent(data.avg_occupancy) : null} />
      <Field label="Monthly Revenue" value={data.avg_monthly_revenue != null ? formatCompactCurrency(data.avg_monthly_revenue) : null} />
      <Field label="Active Listings" value={data.active_listings != null ? formatNumber(data.active_listings) : null} />
      <Field label="Market Score" value={data.market_score} />
    </OutputCard>
  );
}

function RentalizerCard({ data }) {
  if (!data) return null;
  // AirDNA returns vendor-shaped data; pluck the common fields and stop.
  const adr      = data.adr || data.average_daily_rate || data.summary?.adr;
  const occ      = data.occupancy || data.summary?.occupancy;
  const revenue  = data.revenue || data.annual_revenue || data.summary?.revenue;
  if (adr == null && occ == null && revenue == null) return null;
  return (
    <OutputCard title="Rentalizer Projection">
      <Field label="ADR" value={adr != null ? formatCompactCurrency(adr) : null} />
      <Field label="Occupancy" value={occ != null ? formatPercent(occ) : null} />
      <Field label="Annual Revenue" value={revenue != null ? formatCompactCurrency(revenue) : null} />
    </OutputCard>
  );
}

function ValuationCard({ data }) {
  if (!data) return null;
  const est  = data.estimate || data.value;
  const low  = data.low || data.range_low;
  const high = data.high || data.range_high;
  if (est == null && low == null) return null;
  return (
    <OutputCard title="Property Valuation">
      <Field label="Estimate" value={est != null ? formatCompactCurrency(est) : null} />
      <Field label="Low" value={low != null ? formatCompactCurrency(low) : null} />
      <Field label="High" value={high != null ? formatCompactCurrency(high) : null} />
      <Field label="Confidence" value={data.confidence} />
    </OutputCard>
  );
}
