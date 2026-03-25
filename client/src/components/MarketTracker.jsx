import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { formatCurrency, formatPercent, formatNumber } from '../utils/formatters';
import MarketDeepDive from './MarketDeepDive';

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
        properties: {
          id: m.id,
          name: m.name,
          score: m.score ?? 0,
          color: scoreColor(m.score),
          adr: m.adr,
          occupancy: m.occupancy,
          revpar: m.revpar,
          listings: m.listings
        }
      }));

      map.addSource('markets', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features }
      });

      map.addLayer({
        id: 'market-circles', type: 'circle', source: 'markets',
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': ['interpolate', ['linear'], ['get', 'score'], 0, 8, 50, 12, 100, 18],
          'circle-opacity': 0.8,
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#fff'
        }
      });

      map.addLayer({
        id: 'market-labels', type: 'symbol', source: 'markets',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 10,
          'text-offset': [0, 1.8],
          'text-anchor': 'top'
        },
        paint: { 'text-color': '#374151', 'text-halo-color': '#fff', 'text-halo-width': 1 }
      });

      map.on('click', 'market-circles', (e) => {
        if (!e.features?.length) return;
        const id = e.features[0].properties.id;
        setSelectedId(id);
      });

      map.on('mouseenter', 'market-circles', () => map.getCanvas().style.cursor = 'pointer');
      map.on('mouseleave', 'market-circles', () => map.getCanvas().style.cursor = '');
    });

    mapRef.current = map;
    return () => { if (mapRef.current) { try { mapRef.current.remove(); } catch (_) {} mapRef.current = null; } };
  }, [mapboxToken, markets]);

  // Fly to selected market
  useEffect(() => {
    if (!selectedMarket || !mapRef.current) return;
    mapRef.current.flyTo({ center: [selectedMarket.lng, selectedMarket.lat], zoom: 8, duration: 1500 });
  }, [selectedId]);

  if (markets.length === 0) {
    return (
      <div className="h-[calc(100vh-108px)] flex items-center justify-center">
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
    { key: 'name', label: 'Market', w: 'min-w-[140px]' },
    { key: 'score', label: 'Score', w: 'w-16' },
    { key: 'adr', label: 'ADR', w: 'w-20', fmt: v => v ? formatCurrency(v) : '—' },
    { key: 'occupancy', label: 'Occ %', w: 'w-16', fmt: v => v ? formatPercent(v) : '—' },
    { key: 'revpar', label: 'RevPAR', w: 'w-20', fmt: v => v ? formatCurrency(v) : '—' },
    { key: 'listings', label: 'Listings', w: 'w-16', fmt: v => v ? formatNumber(v) : '—' },
  ];

  return (
    <div className="h-[calc(100vh-108px)] flex">
      {/* Leaderboard */}
      <div className="w-[420px] flex-shrink-0 flex flex-col border-r border-border bg-white">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">Market Leaderboard</h2>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-text-tertiary">{markets.length} markets</span>
            <button onClick={onRefresh} className="text-[10px] text-violet-600 hover:underline">Refresh</button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white border-b border-border z-10">
              <tr>
                {COLS.map(c => (
                  <th key={c.key} onClick={() => c.key !== 'rank' && handleSort(c.key)}
                    className={`px-3 py-2 text-left text-[10px] font-semibold text-text-tertiary uppercase tracking-wider ${c.w} ${c.key !== 'rank' ? 'cursor-pointer hover:text-text-primary' : ''}`}>
                    {c.label}
                    {sortCol === c.key && <span className="ml-0.5">{sortDir === 'desc' ? '\u2193' : '\u2191'}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((m, i) => (
                <tr key={m.id} onClick={() => setSelectedId(m.id)}
                  className={`border-b border-border/30 cursor-pointer transition-all hover:bg-violet-50/50 ${selectedId === m.id ? 'bg-violet-50' : ''}`}>
                  <td className="px-3 py-2 text-text-tertiary font-mono">{i + 1}</td>
                  <td className="px-3 py-2 font-medium text-text-primary truncate max-w-[140px]">{m.name}</td>
                  <td className="px-3 py-2">{scoreBadge(m.score)}</td>
                  <td className="px-3 py-2 font-mono">{m.adr ? formatCurrency(m.adr) : '—'}</td>
                  <td className="px-3 py-2 font-mono">{m.occupancy ? formatPercent(m.occupancy) : '—'}</td>
                  <td className="px-3 py-2 font-mono">{m.revpar ? formatCurrency(m.revpar) : '—'}</td>
                  <td className="px-3 py-2 font-mono">{m.listings ? formatNumber(m.listings) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Selected market detail */}
        {selectedMarket && (
          <div className="border-t border-border p-4 bg-surface-1 space-y-2">
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

      {/* Right panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tab bar */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-white shrink-0">
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

        {/* Map (always rendered to preserve state, hidden when deep dive is active) */}
        <div className={`flex-1 relative ${rightPanel === 'map' ? 'block' : 'hidden'}`}>
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
        {rightPanel === 'deepdive' && (
          <div className="flex-1 overflow-auto bg-surface-1">
            {selectedMarket ? (
              <MarketDeepDive
                lat={selectedMarket.lat}
                lng={selectedMarket.lng}
                marketData={selectedMarket.data || null}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-text-tertiary">
                Select a market from the leaderboard to load its 60-month deep dive
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
