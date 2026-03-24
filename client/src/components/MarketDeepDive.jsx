import React, { useState, useEffect } from 'react';
import { lookupMarket, fetchAllMarketMetrics, fetchFuturePacing, fetchRevenueEstimate } from '../utils/api';
import { formatCurrency, formatPercent, formatNumber } from '../utils/formatters';
import { Line, Bar } from 'react-chartjs-2';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const chartBase = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, titleColor: '#0f172a', bodyColor: '#475569', padding: 10, cornerRadius: 10 }
  },
  scales: {
    y: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: '#f1f5f9', drawBorder: false } },
    x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } }
  }
};

export default function MarketDeepDive({ lat, lng, marketData }) {
  const [market, setMarket] = useState(null);
  const [allMetrics, setAllMetrics] = useState(null);
  const [pacing, setPacing] = useState(null);
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeMetric, setActiveMetric] = useState('adr');
  const [loaded, setLoaded] = useState(false);

  // Use the revenue estimate already fetched during analyze if available
  useEffect(() => {
    if (marketData?.calculator_estimate && !marketData.calculator_estimate.error) {
      setEstimate(marketData.calculator_estimate);
    }
  }, [marketData]);

  const loadDeepDive = async () => {
    setLoading(true);
    setError(null);
    try {
      // Step 1: lookup market
      let mkt;
      try {
        mkt = await lookupMarket({ lat, lng });
      } catch (e) {
        console.error('Market lookup failed:', e);
        setError('Market lookup failed — AirROI may not cover this area');
        setLoading(false);
        return;
      }

      if (mkt.error) {
        setError(`Market lookup: ${mkt.error}`);
        setLoading(false);
        return;
      }
      setMarket(mkt);

      // Step 2: build market object — try multiple shapes
      const marketObj = mkt.market
        || (mkt.country && { country: mkt.country, region: mkt.region, locality: mkt.locality })
        || (mkt.market_id && { market_id: mkt.market_id })
        || null;

      if (!marketObj) {
        // No structured market — just show what we got from the lookup
        setLoaded(true);
        setLoading(false);
        return;
      }

      // Step 3: parallel fetch — each wrapped in its own catch
      const [metrics, pace, est] = await Promise.all([
        fetchAllMarketMetrics({ market: marketObj, num_months: 60 }).catch(e => { console.warn('Metrics/all failed:', e); return null; }),
        fetchFuturePacing({ market: marketObj }).catch(e => { console.warn('Pacing failed:', e); return null; }),
        estimate ? Promise.resolve(estimate) : fetchRevenueEstimate({ lat, lng }).catch(e => { console.warn('Calculator failed:', e); return null; }),
      ]);

      if (metrics && !metrics.error) setAllMetrics(metrics);
      if (pace && !pace.error) setPacing(pace);
      if (est && !est.error) setEstimate(est);

      setLoaded(true);
    } catch (e) {
      console.error('Deep dive error:', e);
      setError(`Deep dive failed: ${e.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const metricTabs = [
    { id: 'adr', label: 'ADR', color: '#7c3aed' },
    { id: 'occupancy', label: 'Occupancy', color: '#ec4899' },
    { id: 'revpar', label: 'RevPAR', color: '#0ea5e9' },
    { id: 'revenue', label: 'Revenue', color: '#10b981' },
    { id: 'supply', label: 'Supply', color: '#f97316' },
  ];

  const getTimeSeries = (key) => {
    if (!allMetrics) return null;
    // Try various shapes the API might return
    const d = allMetrics[key] || allMetrics.metrics?.[key] || allMetrics[`average_daily_rate`] || null;
    if (!d) return null;
    return d.monthly || d.time_series || d.data || (Array.isArray(d) ? d : null);
  };

  const currentSeries = getTimeSeries(activeMetric);
  const currentColor = metricTabs.find(t => t.id === activeMetric)?.color || '#7c3aed';

  if (!lat || !lng) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-text-primary">Market Deep Dive</h3>
          {market && (
            <p className="text-xs text-text-tertiary mt-0.5">
              {market.market_name || market.name || [market.locality, market.region].filter(Boolean).join(', ') || 'Market data'}
            </p>
          )}
        </div>
        {!loaded && !loading && (
          <button onClick={loadDeepDive}
            className="px-4 py-2 text-xs font-semibold bg-gradient-brand text-white rounded-xl shadow-glow-violet hover:opacity-90 transition-all">
            Load 60-Month Market Data
          </button>
        )}
        {loading && <Spinner />}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-xs text-red-600 font-medium">{error}</p>
          <button onClick={loadDeepDive} className="text-xs text-red-500 underline mt-1">Retry</button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-10 gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-accent border-t-transparent" />
          <span className="text-text-tertiary text-sm">Loading 60-month market data...</span>
        </div>
      )}

      {/* Revenue estimate card — shows even before deep dive load (from analyze flow) */}
      {estimate && (
        <div className="bg-gradient-card border border-emerald-200 rounded-2xl p-4 shadow-soft">
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-2">ML Revenue Estimate</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Annual Revenue" value={estimate.projected_annual_revenue ? formatCurrency(estimate.projected_annual_revenue) : '—'} accent="emerald" />
            <Stat label="Projected ADR" value={estimate.projected_adr ? `$${Math.round(estimate.projected_adr)}/nt` : '—'} accent="violet" />
            <Stat label="Projected Occ" value={estimate.projected_occupancy ? formatPercent(estimate.projected_occupancy) : '—'} accent="pink" />
            <Stat label="Comps Used" value={estimate.comp_count || '—'} />
          </div>
          {estimate.monthly_revenue_breakdown && Array.isArray(estimate.monthly_revenue_breakdown) && (
            <div className="mt-3 h-32">
              <Bar
                data={{
                  labels: MONTHS.slice(0, estimate.monthly_revenue_breakdown.length),
                  datasets: [{ data: estimate.monthly_revenue_breakdown.map(d => d.revenue || d.value || d), backgroundColor: 'rgba(16,185,129,0.25)', hoverBackgroundColor: 'rgba(16,185,129,0.45)', borderColor: '#10b981', borderWidth: 1.5, borderRadius: 6 }]
                }}
                options={{ ...chartBase, plugins: { ...chartBase.plugins, title: { display: true, text: 'Projected Monthly Revenue', color: '#94a3b8', font: { size: 10, weight: 600 } } } }}
              />
            </div>
          )}
        </div>
      )}

      {/* Future pacing */}
      {pacing && (
        <div className="bg-gradient-card border border-sky-200 rounded-2xl p-4 shadow-soft">
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-2">Forward Pacing (Next 90 Days)</p>
          <div className="grid grid-cols-3 gap-3">
            {pacing.pace_occupancy != null && <Stat label="Pacing Occ" value={formatPercent(pacing.pace_occupancy)} accent="sky" />}
            {pacing.yoy_change != null && (
              <Stat label="vs Last Year" value={`${pacing.yoy_change >= 0 ? '+' : ''}${formatPercent(pacing.yoy_change)}`} accent={pacing.yoy_change >= 0 ? 'emerald' : 'red'} />
            )}
            {pacing.peak_booking_rate != null && <Stat label="Peak Booking" value={formatPercent(pacing.peak_booking_rate)} accent="violet" />}
          </div>
        </div>
      )}

      {/* Metric tabs + chart */}
      {allMetrics && (
        <>
          <div className="flex gap-1 flex-wrap">
            {metricTabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveMetric(tab.id)}
                className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
                  activeMetric === tab.id ? 'text-white shadow-sm' : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-2'
                }`}
                style={activeMetric === tab.id ? { background: tab.color } : {}}>
                {tab.label}
              </button>
            ))}
          </div>

          {currentSeries && Array.isArray(currentSeries) && currentSeries.length > 0 ? (
            <div className="bg-white border border-border rounded-2xl p-4 shadow-soft h-56">
              <Line
                data={{
                  labels: currentSeries.map((d, i) => d.month || d.date || d.label || MONTHS[i % 12]),
                  datasets: [{
                    data: currentSeries.map(d => d.value || d.rate || d.occupancy || d.revenue || d.count || d.revpar || (typeof d === 'number' ? d : 0)),
                    borderColor: currentColor, backgroundColor: `${currentColor}10`, fill: true,
                    tension: 0.3, pointRadius: 2, pointBackgroundColor: currentColor, pointBorderColor: '#fff', pointBorderWidth: 1.5
                  }]
                }}
                options={chartBase}
              />
            </div>
          ) : (
            <div className="bg-surface-1 border border-border rounded-2xl p-6 text-center text-xs text-text-tertiary">
              No time-series data for {metricTabs.find(t => t.id === activeMetric)?.label}
            </div>
          )}

          <MetricsSummary allMetrics={allMetrics} />
        </>
      )}

      {/* Show what we loaded even if some parts failed */}
      {loaded && !allMetrics && !pacing && !estimate && !error && (
        <div className="bg-surface-1 border border-border rounded-2xl p-6 text-center text-xs text-text-tertiary">
          Market found but no detailed metrics available for this area
        </div>
      )}
    </div>
  );
}

function MetricsSummary({ allMetrics }) {
  const extractStat = (key, field) => {
    const d = allMetrics[key] || allMetrics.metrics?.[key];
    if (!d) return null;
    return d[field] ?? d.ttm?.[field] ?? d.summary?.[field] ?? null;
  };

  const stats = [
    { label: 'TTM ADR', value: extractStat('adr', 'ttm_average') || extractStat('average_daily_rate', 'ttm_average'), fmt: v => `$${Math.round(v)}` },
    { label: 'TTM Occupancy', value: extractStat('occupancy', 'ttm_average'), fmt: v => formatPercent(v < 1 ? v * 100 : v) },
    { label: 'TTM RevPAR', value: extractStat('revpar', 'ttm_average'), fmt: v => `$${Math.round(v)}` },
    { label: 'ADR YoY', value: extractStat('adr', 'yoy_change') || extractStat('average_daily_rate', 'yoy_change'), fmt: v => `${v >= 0 ? '+' : ''}${formatPercent(v)}` },
    { label: 'Occ YoY', value: extractStat('occupancy', 'yoy_change'), fmt: v => `${v >= 0 ? '+' : ''}${formatPercent(v)}` },
    { label: 'Active Listings', value: extractStat('active_listings', 'current') || extractStat('supply', 'current'), fmt: v => formatNumber(v) },
    { label: 'Supply YoY', value: extractStat('active_listings', 'yoy_growth') || extractStat('supply', 'yoy_growth'), fmt: v => `${v >= 0 ? '+' : ''}${formatPercent(v)}` },
  ].filter(s => s.value != null);

  if (stats.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {stats.map((s, i) => (
        <div key={i} className="bg-surface-1 rounded-xl px-3 py-2">
          <p className="text-[10px] text-text-tertiary uppercase tracking-wider">{s.label}</p>
          <p className="text-[13px] font-mono font-semibold text-text-primary">{s.fmt(s.value)}</p>
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value, accent }) {
  const colors = { emerald: 'text-emerald-600', violet: 'text-violet-600', pink: 'text-pink-600', sky: 'text-sky-600', red: 'text-red-500' };
  return (
    <div>
      <p className="text-[10px] text-text-tertiary uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-mono font-bold ${colors[accent] || 'text-text-primary'}`}>{value}</p>
    </div>
  );
}

function Spinner() {
  return <div className="animate-spin rounded-full h-4 w-4 border-2 border-accent border-t-transparent" />;
}
