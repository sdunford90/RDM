import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { formatCurrency, formatPercent, formatNumber } from '../utils/formatters';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler } from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const chartBase = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, titleColor: '#0f172a', bodyColor: '#475569', padding: 10, cornerRadius: 10 }
  },
  scales: {
    y: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: '#f1f5f9' } },
    x: { ticks: { color: '#94a3b8', font: { size: 9 }, maxRotation: 45 }, grid: { display: false } }
  }
};

function scoreColor(score) {
  if (score == null) return '#94a3b8';
  if (score >= 70) return '#10b981';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

function scoreBadge(score) {
  const color = scoreColor(score);
  const label = score != null ? Math.round(score) : '—';
  return (
    <span className="inline-flex items-center justify-center w-10 h-6 rounded-lg text-[11px] font-bold text-white" style={{ backgroundColor: color }}>
      {label}
    </span>
  );
}

export default function MarketTracker({ mapboxToken, markets = [], onRefresh }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const [selectedId, setSelectedId] = useState(null);
  const [sortCol, setSortCol] = useState('score');
  const [sortDir, setSortDir] = useState('desc');
  const [rightPanel, setRightPanel] = useState('map');
  const [mobileTab, setMobileTab] = useState('markets');

  const sorted = [...markets].sort((a, b) => {
    const va = a[sortCol] ?? -Infinity;
    const vb = b[sortCol] ?? -Infinity;
    return sortDir === 'desc' ? vb - va : va - vb;
  });

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const selectedMarket = markets.find(m => m.id === selectedId);

  const handleSelectMarket = (id) => {
    setSelectedId(id);
    setMobileTab('detail');
  };

  // Map setup
  useEffect(() => {
    if (!mapboxToken || !mapContainer.current) return;
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

    mapboxgl.accessToken = mapboxToken;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-98, 39], zoom: 3.5
    });
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.on('load', () => {
      if (markets.length === 0) return;
      const features = markets.map(m => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [m.lng, m.lat] },
        properties: { id: m.id, name: m.name, score: m.score ?? 0, color: scoreColor(m.score) }
      }));
      map.addSource('markets', { type: 'geojson', data: { type: 'FeatureCollection', features } });
      map.addLayer({
        id: 'market-circles', type: 'circle', source: 'markets',
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': ['interpolate', ['linear'], ['get', 'score'], 0, 8, 50, 12, 100, 18],
          'circle-opacity': 0.8, 'circle-stroke-width': 2.5, 'circle-stroke-color': '#fff'
        }
      });
      map.addLayer({
        id: 'market-labels', type: 'symbol', source: 'markets',
        layout: { 'text-field': ['get', 'name'], 'text-size': 10, 'text-offset': [0, 1.8], 'text-anchor': 'top' },
        paint: { 'text-color': '#374151', 'text-halo-color': '#fff', 'text-halo-width': 1 }
      });
      map.on('click', 'market-circles', (e) => {
        if (!e.features?.length) return;
        setSelectedId(e.features[0].properties.id);
      });
      map.on('mouseenter', 'market-circles', () => map.getCanvas().style.cursor = 'pointer');
      map.on('mouseleave', 'market-circles', () => map.getCanvas().style.cursor = '');
    });

    mapRef.current = map;
    return () => { if (mapRef.current) { try { mapRef.current.remove(); } catch (_) {} mapRef.current = null; } };
  }, [mapboxToken, markets]);

  useEffect(() => {
    if (!selectedMarket || !mapRef.current) return;
    mapRef.current.flyTo({ center: [selectedMarket.lng, selectedMarket.lat], zoom: 8, duration: 1500 });
  }, [selectedId]);

  if (markets.length === 0) {
    return (
      <div className="h-[calc(100vh-108px)] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-4 bg-emerald-50 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">No Markets Tracked Yet</h3>
          <p className="text-sm text-text-tertiary">Analyze a property to automatically track its market. Markets are scored and ranked based on ADR, occupancy, RevPAR, and supply trends.</p>
        </div>
      </div>
    );
  }

  const COLS = [
    { key: 'rank', label: '#', w: 'w-8' },
    { key: 'name', label: 'Market', w: 'min-w-[120px]' },
    { key: 'score', label: 'Score', w: 'w-16' },
    { key: 'adr', label: 'ADR', w: 'w-20', fmt: v => v ? formatCurrency(v) : '—' },
    { key: 'occupancy', label: 'Occ %', w: 'w-16', fmt: v => v ? formatPercent(v) : '—' },
    { key: 'revpar', label: 'RevPAR', w: 'w-20', fmt: v => v ? formatCurrency(v) : '—' },
    { key: 'listings', label: 'Listings', w: 'w-16', fmt: v => v ? formatNumber(v) : '—' },
  ];

  const MOBILE_TABS = [
    { id: 'markets', label: 'Markets' },
    { id: 'detail', label: 'Detail' },
    { id: 'map', label: 'Map' },
    { id: 'deepdive', label: 'Deep Dive' },
  ];

  return (
    <div className="h-[calc(100vh-108px)] flex flex-col lg:flex-row">

      {/* ── Mobile tab bar ── */}
      <div className="lg:hidden flex border-b border-border bg-white shrink-0 overflow-x-auto">
        {MOBILE_TABS.map(t => (
          <button key={t.id} onClick={() => setMobileTab(t.id)}
            className={`flex-1 min-w-[72px] py-2.5 text-[11px] font-semibold whitespace-nowrap transition-all border-b-2 ${mobileTab === t.id ? 'border-violet-500 text-violet-700' : 'border-transparent text-text-tertiary'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── LEFT: Leaderboard (desktop always visible; mobile "markets" tab) ── */}
      <div className={`lg:w-[400px] lg:flex-shrink-0 flex flex-col border-r border-border bg-white lg:flex ${mobileTab === 'markets' ? 'flex' : 'hidden'} flex-1 lg:flex-none`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold text-text-primary">Market Leaderboard</h2>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-text-tertiary">{markets.length} markets</span>
            <button onClick={onRefresh} className="text-[10px] text-violet-600 hover:underline">Refresh</button>
          </div>
        </div>

        {/* Desktop: table; Mobile: cards */}
        <div className="flex-1 overflow-auto">
          {/* Desktop table */}
          <table className="hidden lg:table w-full text-xs">
            <thead className="sticky top-0 bg-white border-b border-border z-10">
              <tr>
                {COLS.map(c => (
                  <th key={c.key} onClick={() => c.key !== 'rank' && handleSort(c.key)}
                    className={`px-3 py-2 text-left text-[10px] font-semibold text-text-tertiary uppercase tracking-wider ${c.w} ${c.key !== 'rank' ? 'cursor-pointer hover:text-text-primary' : ''}`}>
                    {c.label}{sortCol === c.key && <span className="ml-0.5">{sortDir === 'desc' ? '↓' : '↑'}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((m, i) => (
                <tr key={m.id} onClick={() => setSelectedId(m.id)}
                  className={`border-b border-border/30 cursor-pointer transition-all hover:bg-violet-50/50 ${selectedId === m.id ? 'bg-violet-50' : ''}`}>
                  <td className="px-3 py-2 text-text-tertiary font-mono">{i + 1}</td>
                  <td className="px-3 py-2 font-medium text-text-primary truncate max-w-[120px]">{m.name}</td>
                  <td className="px-3 py-2">{scoreBadge(m.score)}</td>
                  <td className="px-3 py-2 font-mono">{m.adr ? formatCurrency(m.adr) : '—'}</td>
                  <td className="px-3 py-2 font-mono">{m.occupancy ? formatPercent(m.occupancy) : '—'}</td>
                  <td className="px-3 py-2 font-mono">{m.revpar ? formatCurrency(m.revpar) : '—'}</td>
                  <td className="px-3 py-2 font-mono">{m.listings ? formatNumber(m.listings) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile cards */}
          <div className="lg:hidden divide-y divide-border/40">
            {sorted.map((m, i) => (
              <button key={m.id} onClick={() => handleSelectMarket(m.id)}
                className={`w-full text-left px-4 py-3 transition-all ${selectedId === m.id ? 'bg-violet-50' : 'hover:bg-surface-1'}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-tertiary font-mono w-5">{i + 1}</span>
                    <span className="text-sm font-semibold text-text-primary">{m.name}</span>
                  </div>
                  {scoreBadge(m.score)}
                </div>
                <div className="flex items-center gap-4 ml-7 text-[11px] text-text-secondary font-mono">
                  {m.adr && <span>ADR {formatCurrency(m.adr)}</span>}
                  {m.occupancy && <span>Occ {formatPercent(m.occupancy)}</span>}
                  {m.revpar && <span>RevPAR {formatCurrency(m.revpar)}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Desktop: selected market detail */}
        {selectedMarket && (
          <div className="hidden lg:block border-t border-border p-4 bg-surface-1 space-y-2 shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">{selectedMarket.name}</h3>
              {scoreBadge(selectedMarket.score)}
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <Stat label="ADR" value={selectedMarket.adr ? formatCurrency(selectedMarket.adr) : '—'} />
              <Stat label="Occupancy" value={selectedMarket.occupancy ? formatPercent(selectedMarket.occupancy) : '—'} />
              <Stat label="RevPAR" value={selectedMarket.revpar ? formatCurrency(selectedMarket.revpar) : '—'} />
              <Stat label="Monthly Rev" value={selectedMarket.monthlyRev ? formatCurrency(selectedMarket.monthlyRev) : '—'} />
              <Stat label="Active Listings" value={selectedMarket.listings ? formatNumber(selectedMarket.listings) : '—'} />
              <Stat label="Supply Growth" value={selectedMarket.supplyGrowth != null ? formatPercent(selectedMarket.supplyGrowth) : '—'} />
            </div>
            <p className="text-[10px] text-text-tertiary">Last updated: {new Date(selectedMarket.updatedAt).toLocaleDateString()}</p>
          </div>
        )}
      </div>

      {/* ── Mobile: Detail tab ── */}
      {mobileTab === 'detail' && (
        <div className="lg:hidden flex-1 overflow-auto bg-white">
          {selectedMarket ? (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-text-primary">{selectedMarket.name}</h3>
                  <p className="text-[10px] text-text-tertiary">Last updated: {new Date(selectedMarket.updatedAt).toLocaleDateString()}</p>
                </div>
                {scoreBadge(selectedMarket.score)}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="ADR" value={selectedMarket.adr ? formatCurrency(selectedMarket.adr) : '—'} />
                <Stat label="Occupancy" value={selectedMarket.occupancy ? formatPercent(selectedMarket.occupancy) : '—'} />
                <Stat label="RevPAR" value={selectedMarket.revpar ? formatCurrency(selectedMarket.revpar) : '—'} />
                <Stat label="Monthly Rev" value={selectedMarket.monthlyRev ? formatCurrency(selectedMarket.monthlyRev) : '—'} />
                <Stat label="Active Listings" value={selectedMarket.listings ? formatNumber(selectedMarket.listings) : '—'} />
                <Stat label="Supply Growth" value={selectedMarket.supplyGrowth != null ? formatPercent(selectedMarket.supplyGrowth) : '—'} />
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider mb-3">60-Month Deep Dive</p>
                <DeepDivePanel market={selectedMarket} />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-text-tertiary">
              Tap a market from the Markets tab
            </div>
          )}
        </div>
      )}

      {/* ── RIGHT: Map + Deep Dive (desktop always visible; mobile "map"/"deepdive" tabs) ── */}
      <div className={`flex-1 flex flex-col min-w-0 lg:flex ${mobileTab === 'map' || mobileTab === 'deepdive' ? 'flex' : 'hidden'}`}>
        {/* Desktop tab bar */}
        <div className="hidden lg:flex items-center gap-1 px-3 py-2 border-b border-border bg-white shrink-0">
          {[{ id: 'map', label: 'Map' }, { id: 'deepdive', label: '60-Mo Deep Dive' }].map(t => (
            <button key={t.id} onClick={() => setRightPanel(t.id)}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${rightPanel === t.id ? 'bg-violet-100 text-violet-700' : 'text-text-tertiary hover:text-text-primary hover:bg-surface-1'}`}>
              {t.label}
            </button>
          ))}
          {rightPanel === 'deepdive' && !selectedMarket && (
            <span className="ml-2 text-[10px] text-text-tertiary italic">Select a market from the leaderboard</span>
          )}
        </div>

        {/* Map — always rendered, hidden on deepdive */}
        <div className={`flex-1 relative ${(rightPanel === 'map' && mobileTab !== 'deepdive') || mobileTab === 'map' ? 'block' : 'hidden'}`}>
          <div ref={mapContainer} className="w-full h-full" />
          <div className="absolute top-3 right-14 bg-white/90 backdrop-blur-md rounded-xl px-3 py-2 shadow-card text-[10px] space-y-1">
            {[['70+', '#10b981', 'Strong'], ['50-70', '#f59e0b', 'Moderate'], ['< 50', '#ef4444', 'Weak']].map(([range, color, label]) => (
              <div key={range} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-text-secondary">{label} ({range})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Deep Dive panel */}
        {(rightPanel === 'deepdive' || mobileTab === 'deepdive') && (
          <div className="flex-1 overflow-auto bg-surface-1 p-4">
            {selectedMarket ? (
              <DeepDivePanel market={selectedMarket} />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-text-tertiary">
                Select a market to load its deep dive
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white rounded-lg px-2.5 py-1.5 border border-border/50">
      <p className="text-[9px] text-text-tertiary uppercase tracking-wider">{label}</p>
      <p className="text-xs font-mono font-medium text-text-primary">{value}</p>
    </div>
  );
}

function DDStat({ label, value, color }) {
  return (
    <div className="bg-white rounded-xl px-3 py-2.5 border border-border/50 shadow-sm">
      <p className="text-[9px] font-semibold text-text-tertiary uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-sm font-mono font-bold ${color || 'text-text-primary'}`}>{value ?? '—'}</p>
    </div>
  );
}

function DeepDivePanel({ market }) {
  const [activeMetric, setActiveMetric] = useState('adr');
  const dd = market?.data?.deepDive;
  const metrics = dd?.allMetrics;
  const pacing = dd?.pacing;
  const estimate = dd?.estimate;

  if (!dd || !metrics) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
        <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center">
          <svg className="w-6 h-6 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary mb-1">No deep dive data yet</p>
          <p className="text-xs text-text-tertiary max-w-xs">Analyze a property in this market, load the 60-month deep dive on the Overview tab. It saves automatically.</p>
        </div>
      </div>
    );
  }

  const marketLabel = dd.market?.market_name || dd.market?.locality || market.name;

  const METRIC_TABS = [
    { id: 'adr',       label: 'ADR',       color: '#7c3aed', key: 'adr' },
    { id: 'occupancy', label: 'Occupancy',  color: '#ec4899', key: 'occupancy' },
    { id: 'revpar',    label: 'RevPAR',     color: '#0ea5e9', key: 'revpar' },
    { id: 'revenue',   label: 'Revenue',    color: '#10b981', key: 'revenue' },
    { id: 'supply',    label: 'Supply',     color: '#f97316', key: 'supply' },
  ];

  const getTimeSeries = (key) => {
    const d = metrics[key] || metrics.metrics?.[key];
    if (!d) return null;
    return d.monthly || d.time_series || d.data || (Array.isArray(d) ? d : null);
  };

  const extractTTM = (key, field) => {
    const d = metrics[key] || metrics.metrics?.[key];
    if (!d) return null;
    return d[field] ?? d.ttm?.[field] ?? null;
  };

  const activeTab = METRIC_TABS.find(t => t.id === activeMetric);
  const series = getTimeSeries(activeMetric);
  const color = activeTab?.color || '#7c3aed';

  const summaryStats = [
    { label: 'TTM ADR',     value: extractTTM('adr', 'ttm_average'),       fmt: v => formatCurrency(v),                 color: 'text-violet-600' },
    { label: 'TTM Occ',     value: extractTTM('occupancy', 'ttm_average'),  fmt: v => formatPercent(v < 1 ? v * 100 : v), color: 'text-pink-600' },
    { label: 'TTM RevPAR',  value: extractTTM('revpar', 'ttm_average'),     fmt: v => formatCurrency(v),                 color: 'text-sky-600' },
    { label: 'TTM Rev/Mo',  value: extractTTM('revenue', 'ttm_average'),    fmt: v => formatCurrency(v),                 color: 'text-emerald-600' },
    { label: 'ADR YoY',     value: extractTTM('adr', 'yoy_change'),         fmt: v => `${v >= 0 ? '+' : ''}${formatPercent(v)}`, color: v => v >= 0 ? 'text-emerald-600' : 'text-red-500' },
    { label: 'Occ YoY',     value: extractTTM('occupancy', 'yoy_change'),   fmt: v => `${v >= 0 ? '+' : ''}${formatPercent(v)}`, color: v => v >= 0 ? 'text-emerald-600' : 'text-red-500' },
    { label: 'Supply',      value: extractTTM('supply', 'current') || extractTTM('active_listings', 'current'), fmt: v => formatNumber(Math.round(v)) },
    { label: 'Supply YoY',  value: extractTTM('supply', 'yoy_growth') || extractTTM('active_listings', 'yoy_growth'), fmt: v => `${v >= 0 ? '+' : ''}${formatPercent(v)}`, color: v => v >= 0 ? 'text-red-500' : 'text-emerald-600' },
  ].filter(s => s.value != null);

  const pacingFill = pacing?.pace_occupancy;
  const pacingYoy = pacing?.yoy_change;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-text-primary">{marketLabel}</p>
        <p className="text-[10px] text-text-tertiary">60-month history · saved from last deep dive</p>
      </div>

      {/* Summary stats grid */}
      {summaryStats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {summaryStats.map((s, i) => {
            const colorClass = typeof s.color === 'function' ? s.color(s.value) : (s.color || 'text-text-primary');
            return (
              <div key={i} className="bg-white rounded-xl px-3 py-2.5 border border-border/50 shadow-sm">
                <p className="text-[9px] font-semibold text-text-tertiary uppercase tracking-wider mb-0.5">{s.label}</p>
                <p className={`text-sm font-mono font-bold ${colorClass}`}>{s.fmt(s.value)}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Metric chart tabs */}
      <div className="bg-white rounded-2xl border border-border shadow-soft p-4 space-y-3">
        <div className="flex flex-wrap gap-1">
          {METRIC_TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveMetric(tab.id)}
              className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${activeMetric === tab.id ? 'text-white shadow-sm' : 'text-text-tertiary hover:bg-surface-1'}`}
              style={activeMetric === tab.id ? { background: tab.color } : {}}>
              {tab.label}
            </button>
          ))}
        </div>

        {series && series.length > 0 ? (
          <div className="h-52">
            <Line
              data={{
                labels: series.map((d, i) => d.month || d.date || d.label || MONTHS[i % 12]),
                datasets: [{
                  data: series.map(d => d.value || d.rate || d.occupancy || d.revenue || d.count || d.revpar || (typeof d === 'number' ? d : 0)),
                  borderColor: color,
                  backgroundColor: `${color}15`,
                  fill: true,
                  tension: 0.3,
                  pointRadius: series.length > 24 ? 1 : 3,
                  pointBackgroundColor: color,
                  pointBorderColor: '#fff',
                  pointBorderWidth: 1.5,
                }]
              }}
              options={{
                ...chartBase,
                plugins: {
                  ...chartBase.plugins,
                  title: { display: true, text: `${activeTab?.label} — 60-Month History`, color: '#94a3b8', font: { size: 10, weight: '600' } }
                }
              }}
            />
          </div>
        ) : (
          <div className="h-24 flex items-center justify-center text-xs text-text-tertiary bg-surface-1 rounded-xl">
            No time-series data for {activeTab?.label}
          </div>
        )}
      </div>

      {/* Projected monthly revenue */}
      {estimate?.monthly_revenue_breakdown && Array.isArray(estimate.monthly_revenue_breakdown) && (
        <div className="bg-white rounded-2xl border border-border shadow-soft p-4">
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-3">Projected Monthly Revenue</p>
          <div className="h-44">
            <Bar
              data={{
                labels: MONTHS.slice(0, estimate.monthly_revenue_breakdown.length),
                datasets: [{
                  data: estimate.monthly_revenue_breakdown.map(d => d.revenue || d.value || d),
                  backgroundColor: 'rgba(16,185,129,0.2)',
                  hoverBackgroundColor: 'rgba(16,185,129,0.4)',
                  borderColor: '#10b981',
                  borderWidth: 1.5,
                  borderRadius: 6
                }]
              }}
              options={chartBase}
            />
          </div>
        </div>
      )}

      {/* Forward pacing */}
      {pacing && (
        <div className="bg-white rounded-2xl border border-sky-200 shadow-soft p-4 space-y-3">
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Forward Pacing</p>
          <div className="grid grid-cols-2 gap-2">
            {pacingFill != null && (
              <div className="bg-surface-1 rounded-xl px-3 py-2.5">
                <p className="text-[9px] font-semibold text-text-tertiary uppercase tracking-wider mb-0.5">Avg Fill Rate</p>
                <p className={`text-sm font-mono font-bold ${pacingFill >= 60 ? 'text-emerald-600' : pacingFill >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                  {Math.round(pacingFill)}% booked
                </p>
              </div>
            )}
            {pacingYoy != null && (
              <div className="bg-surface-1 rounded-xl px-3 py-2.5">
                <p className="text-[9px] font-semibold text-text-tertiary uppercase tracking-wider mb-0.5">vs Last Year</p>
                <p className={`text-sm font-mono font-bold ${pacingYoy >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {pacingYoy >= 0 ? '+' : ''}{Math.round(pacingYoy)}%
                </p>
              </div>
            )}
            {pacing.peak_booking_rate != null && (
              <div className="bg-surface-1 rounded-xl px-3 py-2.5">
                <p className="text-[9px] font-semibold text-text-tertiary uppercase tracking-wider mb-0.5">Peak Fill</p>
                <p className="text-sm font-mono font-bold text-violet-600">{formatPercent(pacing.peak_booking_rate)}</p>
              </div>
            )}
            {pacing.avg_booked_rate != null && (
              <div className="bg-surface-1 rounded-xl px-3 py-2.5">
                <p className="text-[9px] font-semibold text-text-tertiary uppercase tracking-wider mb-0.5">Booked Rate</p>
                <p className="text-sm font-mono font-bold text-emerald-600">${pacing.avg_booked_rate}/nt</p>
              </div>
            )}
          </div>
          {pacingFill != null && (
            <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, pacingFill)}%`, backgroundColor: pacingFill >= 60 ? '#10b981' : pacingFill >= 40 ? '#f59e0b' : '#ef4444' }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
