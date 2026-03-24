import React, { useState, useEffect } from 'react';
import { fetchListingDetail, fetchListingMetrics, fetchListingComps, fetchListingFutureRates } from '../utils/api';
import { formatCurrency, formatPercent, formatNumber } from '../utils/formatters';
import { Line, Bar } from 'react-chartjs-2';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const chartBase = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, titleColor: '#0f172a', bodyColor: '#475569', padding: 10, cornerRadius: 10 } },
  scales: {
    y: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: '#f1f5f9', drawBorder: false } },
    x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } }
  }
};

export default function ListingDetail({ listingId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [comps, setComps] = useState(null);
  const [futureRates, setFutureRates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!listingId) return;
    loadAll();
  }, [listingId]);

  const loadAll = async () => {
    setLoading(true);
    const [d, m, c, f] = await Promise.all([
      fetchListingDetail(listingId).catch(() => null),
      fetchListingMetrics(listingId, 60).catch(() => null),
      fetchListingComps(listingId).catch(() => null),
      fetchListingFutureRates(listingId).catch(() => null),
    ]);
    setDetail(d?.error ? null : d);
    setMetrics(m?.error ? null : m);
    setComps(c?.error ? null : c);
    setFutureRates(f?.error ? null : f);
    setLoading(false);
  };

  if (!listingId) return null;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'history', label: 'History' },
    { id: 'comps', label: 'Comps' },
    { id: 'rates', label: 'Rates' },
  ];

  return (
    <div className="bg-white border border-border rounded-2xl shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-violet-50 to-pink-50">
        <div>
          <h3 className="text-sm font-bold text-text-primary">
            {detail?.name || detail?.listing_name || `Listing ${listingId}`}
          </h3>
          <p className="text-[11px] text-text-tertiary mt-0.5">
            {detail?.locality && `${detail.locality}, ${detail.region}`}
            {detail?.bedrooms && ` · ${detail.bedrooms} bed`}
            {detail?.bathrooms && ` · ${detail.bathrooms} bath`}
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary hover:bg-white/60 transition-all">x</button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 py-2 border-b border-border">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
              activeTab === t.id ? 'bg-accent text-white' : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-2'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 max-h-[500px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8 gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-accent border-t-transparent" />
            <span className="text-xs text-text-tertiary">Loading listing data...</span>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && <OverviewTab detail={detail} />}
            {activeTab === 'history' && <HistoryTab metrics={metrics} />}
            {activeTab === 'comps' && <CompsTab comps={comps} />}
            {activeTab === 'rates' && <RatesTab futureRates={futureRates} />}
          </>
        )}
      </div>
    </div>
  );
}

function OverviewTab({ detail }) {
  if (!detail) return <Empty>No listing detail available</Empty>;

  const d = detail;
  const ttm = d.performance_ttm || d.ttm || {};
  const l90 = d.performance_l90d || d.l90d || {};
  const ratings = d.ratings || {};

  return (
    <div className="space-y-4">
      {/* Performance cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <KPI label="TTM Revenue" value={ttm.revenue ? formatCurrency(ttm.revenue) : '—'} color="emerald" />
        <KPI label="TTM ADR" value={ttm.avg_rate ? `$${Math.round(ttm.avg_rate)}` : '—'} color="violet" />
        <KPI label="TTM Occupancy" value={ttm.occupancy ? formatPercent(ttm.occupancy > 1 ? ttm.occupancy : ttm.occupancy * 100) : '—'} color="pink" />
        <KPI label="L90 Revenue" value={l90.revenue ? formatCurrency(l90.revenue) : '—'} color="sky" />
        <KPI label="Days Booked" value={ttm.days_booked || '—'} color="amber" />
        <KPI label="RevPAR" value={ttm.revpar ? `$${Math.round(ttm.revpar)}` : '—'} color="teal" />
      </div>

      {/* Property details */}
      <div className="grid grid-cols-2 gap-1.5">
        {d.room_type && <D label="Type" value={d.room_type} />}
        {d.bedrooms != null && <D label="Bedrooms" value={d.bedrooms} />}
        {d.bathrooms != null && <D label="Bathrooms" value={d.bathrooms} />}
        {d.max_guests != null && <D label="Max Guests" value={d.max_guests} />}
        {d.nightly_rate != null && <D label="Nightly Rate" value={`$${d.nightly_rate}`} />}
        {d.cleaning_fee != null && <D label="Cleaning Fee" value={`$${d.cleaning_fee}`} />}
        {d.min_nights != null && <D label="Min Nights" value={d.min_nights} />}
        {d.instant_book != null && <D label="Instant Book" value={d.instant_book ? 'Yes' : 'No'} />}
      </div>

      {/* Host info */}
      {(d.host_name || d.superhost != null) && (
        <div className="bg-surface-1 rounded-xl p-3">
          <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Host</p>
          <p className="text-sm text-text-primary font-medium">
            {d.host_name}
            {d.superhost && <span className="ml-2 px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg text-[10px] font-bold">Superhost</span>}
            {d.professional_management && <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-[10px] font-bold">Pro Managed</span>}
          </p>
        </div>
      )}

      {/* Ratings */}
      {Object.keys(ratings).length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-2">Ratings</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
            {['overall', 'cleanliness', 'accuracy', 'location', 'check_in', 'communication', 'value'].map(key => {
              const val = ratings[key] || ratings[key.replace('_', '-')];
              if (val == null) return null;
              return <D key={key} label={key.replace('_', ' ')} value={`${val}/5`} />;
            })}
          </div>
        </div>
      )}

      {/* Amenities */}
      {d.amenities && Array.isArray(d.amenities) && d.amenities.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-2">Amenities</p>
          <div className="flex flex-wrap gap-1">
            {d.amenities.slice(0, 20).map((a, i) => (
              <span key={i} className="px-2 py-0.5 bg-surface-2 text-text-secondary text-[10px] rounded-lg">{a}</span>
            ))}
            {d.amenities.length > 20 && <span className="text-[10px] text-text-tertiary">+{d.amenities.length - 20} more</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryTab({ metrics }) {
  if (!metrics) return <Empty>No historical metrics available</Empty>;

  const series = metrics.monthly || metrics.data || metrics.time_series || (Array.isArray(metrics) ? metrics : []);
  if (series.length === 0) return <Empty>No monthly data available</Empty>;

  const makeChart = (label, key, color) => {
    const data = series.map(d => d[key]).filter(v => v != null);
    if (data.length === 0) return null;
    return (
      <div className="h-40 bg-white border border-border rounded-xl p-3 shadow-soft">
        <Line
          data={{
            labels: series.map((d, i) => d.month || d.date || MONTHS[i % 12]),
            datasets: [{ data, borderColor: color, backgroundColor: `${color}10`, fill: true, tension: 0.3, pointRadius: 1.5, pointBackgroundColor: color }]
          }}
          options={{ ...chartBase, plugins: { ...chartBase.plugins, title: { display: true, text: label, color: '#94a3b8', font: { size: 10, weight: 600 } } } }}
        />
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {makeChart('Revenue ($)', 'revenue', '#10b981')}
      {makeChart('ADR ($)', 'adr', '#7c3aed') || makeChart('ADR ($)', 'avg_rate', '#7c3aed')}
      {makeChart('Occupancy (%)', 'occupancy', '#ec4899')}
      {makeChart('RevPAR ($)', 'revpar', '#0ea5e9')}
      {makeChart('Days Booked', 'days_booked', '#f97316')}
    </div>
  );
}

function CompsTab({ comps }) {
  if (!comps) return <Empty>No comparable listings found</Empty>;
  const list = comps.results || comps.comparables || comps.listings || (Array.isArray(comps) ? comps : []);
  if (list.length === 0) return <Empty>No comps available</Empty>;

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{list.length} Comparable Listings</p>
      <div className="space-y-1.5">
        {list.map((c, i) => {
          const perf = c.performance_metrics || c.ttm || {};
          return (
            <div key={i} className="bg-surface-1 rounded-xl p-3 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text-primary truncate">{c.name || c.listing_name || `Comp ${i + 1}`}</p>
                <p className="text-[10px] text-text-tertiary">
                  {c.bedrooms && `${c.bedrooms} bed`}
                  {c.rating_overall && ` · ${c.rating_overall}/5`}
                  {c.num_reviews && ` · ${c.num_reviews} reviews`}
                </p>
              </div>
              <div className="flex gap-4 text-right">
                <div>
                  <p className="text-[10px] text-text-tertiary">Revenue</p>
                  <p className="text-xs font-mono font-semibold text-emerald-600">{perf.ttm_revenue ? formatCurrency(perf.ttm_revenue) : '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-tertiary">ADR</p>
                  <p className="text-xs font-mono font-semibold text-violet-600">{perf.ttm_avg_rate ? `$${Math.round(perf.ttm_avg_rate)}` : '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-tertiary">Occ</p>
                  <p className="text-xs font-mono font-semibold text-pink-600">{perf.ttm_occupancy ? formatPercent(perf.ttm_occupancy > 1 ? perf.ttm_occupancy : perf.ttm_occupancy * 100) : '—'}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comp summary */}
      {list.length > 1 && (() => {
        const perfs = list.map(c => c.performance_metrics || c.ttm || {}).filter(p => p.ttm_revenue > 0);
        if (perfs.length === 0) return null;
        const avgRev = perfs.reduce((s, p) => s + p.ttm_revenue, 0) / perfs.length;
        const avgADR = perfs.reduce((s, p) => s + (p.ttm_avg_rate || 0), 0) / perfs.length;
        const avgOcc = perfs.reduce((s, p) => s + (p.ttm_occupancy || 0), 0) / perfs.length;
        return (
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 mt-2">
            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Comp Set Average</p>
            <div className="flex gap-6">
              <span className="text-xs font-mono font-semibold text-emerald-600">Rev: {formatCurrency(avgRev)}</span>
              <span className="text-xs font-mono font-semibold text-violet-600">ADR: ${Math.round(avgADR)}</span>
              <span className="text-xs font-mono font-semibold text-pink-600">Occ: {formatPercent(avgOcc > 1 ? avgOcc : avgOcc * 100)}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function RatesTab({ futureRates }) {
  if (!futureRates) return <Empty>No forward rate data available</Empty>;
  const rates = futureRates.rates || futureRates.calendar || futureRates.data || (Array.isArray(futureRates) ? futureRates : []);
  if (rates.length === 0) return <Empty>No rate calendar available</Empty>;

  // Show first 90 days as a chart
  const slice = rates.slice(0, 90);
  const avgRate = slice.reduce((s, r) => s + (r.rate || r.price || r.nightly_rate || 0), 0) / slice.length;
  const availCount = slice.filter(r => r.available !== false).length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <KPI label="Avg Rate (90d)" value={`$${Math.round(avgRate)}`} color="violet" />
        <KPI label="Available" value={`${availCount}/${slice.length} nights`} color="sky" />
        <KPI label="Booked" value={`${slice.length - availCount} nights`} color="pink" />
      </div>

      <div className="h-44 bg-white border border-border rounded-xl p-3 shadow-soft">
        <Line
          data={{
            labels: slice.map((r, i) => r.date || `Day ${i + 1}`),
            datasets: [{
              data: slice.map(r => r.rate || r.price || r.nightly_rate || 0),
              borderColor: '#7c3aed', backgroundColor: 'rgba(124,58,237,0.05)', fill: true, tension: 0.2, pointRadius: 0
            }]
          }}
          options={{ ...chartBase, plugins: { ...chartBase.plugins, title: { display: true, text: '90-Day Forward Rates ($)', color: '#94a3b8', font: { size: 10, weight: 600 } } } }}
        />
      </div>

      {/* Dynamic pricing check */}
      {slice.length > 7 && (() => {
        const prices = slice.map(r => r.rate || r.price || r.nightly_rate || 0).filter(p => p > 0);
        if (prices.length < 7) return null;
        const min = Math.min(...prices), max = Math.max(...prices);
        const variance = max > 0 ? ((max - min) / max) * 100 : 0;
        const isDynamic = variance > 15;
        return (
          <div className={`${isDynamic ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'} border rounded-xl p-3`}>
            <p className={`text-[11px] font-semibold ${isDynamic ? 'text-emerald-700' : 'text-amber-700'}`}>
              {isDynamic ? 'Dynamic pricing detected' : 'Flat-rate pricing detected'} — {Math.round(variance)}% rate variance
            </p>
            <p className="text-[10px] text-text-tertiary mt-0.5">
              Range: ${Math.round(min)} – ${Math.round(max)}/night.
              {!isDynamic && ' RDM dynamic pricing would unlock revenue upside.'}
            </p>
          </div>
        );
      })()}
    </div>
  );
}

function KPI({ label, value, color }) {
  const bg = { emerald: 'bg-emerald-50', violet: 'bg-violet-50', pink: 'bg-pink-50', sky: 'bg-sky-50', amber: 'bg-amber-50', teal: 'bg-teal-50' };
  const text = { emerald: 'text-emerald-600', violet: 'text-violet-600', pink: 'text-pink-600', sky: 'text-sky-600', amber: 'text-amber-600', teal: 'text-teal-600' };
  return (
    <div className={`${bg[color] || 'bg-surface-1'} rounded-xl p-2.5`}>
      <p className="text-[10px] text-text-tertiary uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-mono font-bold ${text[color] || 'text-text-primary'}`}>{value}</p>
    </div>
  );
}

function D({ label, value }) {
  return (
    <div className="bg-surface-1 rounded-lg px-3 py-2">
      <p className="text-[10px] text-text-tertiary uppercase tracking-wider">{label}</p>
      <p className="text-[13px] font-mono text-text-primary">{String(value)}</p>
    </div>
  );
}

function Empty({ children }) { return <div className="text-center py-8 text-xs text-text-tertiary">{children}</div>; }
