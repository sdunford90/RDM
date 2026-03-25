import React, { useState, useEffect, useRef, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import { refreshPipeline, geocodePipeline } from '../utils/api';
import { formatCurrency } from '../utils/formatters';

const STATUS_COLORS = {
  closed: '#10b981', close: '#10b981',
  loi: '#3b82f6', 'letter of intent': '#3b82f6',
  review: '#f59e0b', 'under review': '#f59e0b',
  dd: '#8b5cf6', 'due diligence': '#8b5cf6',
  lead: '#94a3b8', new: '#94a3b8', prospect: '#94a3b8',
  passed: '#ef4444', dead: '#ef4444'
};

function getStatusColor(status) {
  if (!status) return '#94a3b8';
  const lower = status.toLowerCase().trim();
  return STATUS_COLORS[lower] || '#94a3b8';
}

// Detect "price-like" columns
function isPriceColumn(header) {
  return /price|value|cost|revenue|income|noi|tax/i.test(header);
}

export default function Pipeline({ mapboxToken, data, loading, onRefresh, onAnalyze }) {
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [showMap, setShowMap] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const mapContainer = useRef(null);
  const mapRef = useRef(null);

  const { headers = [], rows = [], addressColumn, total = 0, error, cachedAt } = data;

  // Find status column
  const statusColumn = useMemo(() => {
    return headers.find(h => /status|stage|phase/i.test(h)) || null;
  }, [headers]);

  // Filter rows by search
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(row =>
      headers.some(h => String(row[h] || '').toLowerCase().includes(q))
    );
  }, [rows, headers, search]);

  // Sort rows
  const sortedRows = useMemo(() => {
    if (!sortCol) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const va = a[sortCol] || '';
      const vb = b[sortCol] || '';
      const na = parseFloat(String(va).replace(/[$,]/g, ''));
      const nb = parseFloat(String(vb).replace(/[$,]/g, ''));
      if (!isNaN(na) && !isNaN(nb)) return sortDir === 'asc' ? na - nb : nb - na;
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }, [filteredRows, sortCol, sortDir]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const handleRefresh = async () => {
    try { await refreshPipeline(); onRefresh(); } catch (e) { console.error(e); }
  };

  const handleGeocode = async () => {
    setGeocoding(true);
    try { await geocodePipeline(); onRefresh(); } catch (e) { console.error(e); }
    finally { setGeocoding(false); }
  };

  const handleRowClick = (row) => {
    setSelectedRow(row);
    const addr = addressColumn ? row[addressColumn] : null;
    if (addr && (row._lat || row._lng)) {
      onAnalyze(addr, { lat: row._lat, lng: row._lng });
    } else if (addr) {
      onAnalyze(addr, {});
    }
  };

  // Map setup
  useEffect(() => {
    if (!mapboxToken || !mapContainer.current || !showMap) return;
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

    mapboxgl.accessToken = mapboxToken;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-96, 38], zoom: 3.5
    });
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.on('load', () => {
      const features = rows
        .filter(r => r._lat && r._lng)
        .map(r => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [r._lng, r._lat] },
          properties: {
            address: addressColumn ? r[addressColumn] : 'Unknown',
            status: statusColumn ? r[statusColumn] : '',
            color: getStatusColor(statusColumn ? r[statusColumn] : ''),
            rowIndex: r._rowIndex
          }
        }));

      map.addSource('pipeline', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
        cluster: true, clusterMaxZoom: 12, clusterRadius: 40
      });

      // Cluster circles
      map.addLayer({
        id: 'pipeline-clusters', type: 'circle', source: 'pipeline',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#7c3aed',
          'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 30, 32],
          'circle-opacity': 0.7
        }
      });

      map.addLayer({
        id: 'pipeline-cluster-count', type: 'symbol', source: 'pipeline',
        filter: ['has', 'point_count'],
        layout: { 'text-field': '{point_count_abbreviated}', 'text-size': 11 },
        paint: { 'text-color': '#fff' }
      });

      // Individual markers
      map.addLayer({
        id: 'pipeline-points', type: 'circle', source: 'pipeline',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': 7,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff'
        }
      });

      // Click cluster to zoom
      map.on('click', 'pipeline-clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['pipeline-clusters'] });
        const clusterId = features[0]?.properties?.cluster_id;
        map.getSource('pipeline').getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (!err) map.flyTo({ center: features[0].geometry.coordinates, zoom });
        });
      });

      // Click point popup
      map.on('click', 'pipeline-points', (e) => {
        if (!e.features?.length) return;
        const f = e.features[0];
        const coords = f.geometry.coordinates.slice();
        new mapboxgl.Popup({ closeButton: true, maxWidth: '240px' })
          .setLngLat(coords)
          .setHTML(`<div style="font-family:Inter,system-ui;padding:8px"><strong style="color:#7c3aed">${f.properties.address}</strong>${f.properties.status ? `<br/><span style="font-size:11px;color:${f.properties.color}">${f.properties.status}</span>` : ''}</div>`)
          .addTo(map);
      });

      map.on('mouseenter', 'pipeline-points', () => map.getCanvas().style.cursor = 'pointer');
      map.on('mouseleave', 'pipeline-points', () => map.getCanvas().style.cursor = '');
      map.on('mouseenter', 'pipeline-clusters', () => map.getCanvas().style.cursor = 'pointer');
      map.on('mouseleave', 'pipeline-clusters', () => map.getCanvas().style.cursor = '');
    });

    mapRef.current = map;
    return () => { if (mapRef.current) { try { mapRef.current.remove(); } catch (_) {} mapRef.current = null; } };
  }, [mapboxToken, rows, showMap]);

  if (error && rows.length === 0) {
    return (
      <div className="h-[calc(100vh-108px)] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-violet-50 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">Connect Google Sheet</h3>
          <p className="text-sm text-text-tertiary mb-4">Set up your pipeline by connecting a Google Sheet with marina opportunities.</p>
          <div className="text-left bg-surface-2 rounded-xl p-4 text-xs text-text-secondary space-y-2">
            <p><strong>1.</strong> Create a Google Cloud service account</p>
            <p><strong>2.</strong> Enable the Google Sheets API</p>
            <p><strong>3.</strong> Share your sheet with the service account email</p>
            <p><strong>4.</strong> Set these env vars:</p>
            <code className="block bg-surface-3 rounded-lg p-2 text-[10px] font-mono">
              GOOGLE_SERVICE_ACCOUNT_JSON={"{"}"type":"service_account"...{"}"}<br/>
              GOOGLE_SHEET_ID=your_spreadsheet_id
            </code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-108px)] flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-white/80 backdrop-blur-md">
        <div className="relative flex-1 max-w-sm">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search all columns..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-border bg-surface-1 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300" />
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <span className="text-[11px] text-text-tertiary">
          {filteredRows.length === total ? `${total} opportunities` : `${filteredRows.length} of ${total}`}
        </span>

        {cachedAt && (
          <span className="text-[10px] text-text-tertiary">
            Cached {new Date(cachedAt).toLocaleTimeString()}
          </span>
        )}

        <button onClick={handleRefresh} disabled={loading}
          className="px-3 py-1.5 text-[11px] font-medium text-violet-600 bg-violet-50 rounded-lg hover:bg-violet-100 transition-all disabled:opacity-50">
          Refresh
        </button>

        <button onClick={handleGeocode} disabled={geocoding}
          className="px-3 py-1.5 text-[11px] font-medium text-sky-600 bg-sky-50 rounded-lg hover:bg-sky-100 transition-all disabled:opacity-50">
          {geocoding ? 'Geocoding...' : 'Geocode'}
        </button>

        <button onClick={() => setShowMap(!showMap)}
          className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all ${showMap ? 'text-emerald-600 bg-emerald-50' : 'text-text-tertiary bg-surface-2'}`}>
          {showMap ? 'Hide Map' : 'Show Map'}
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Table */}
        <div className={`${showMap ? 'w-1/2' : 'w-full'} overflow-auto`}>
          {loading && rows.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white z-10 border-b border-border">
                <tr>
                  {headers.map(h => (
                    <th key={h} onClick={() => handleSort(h)}
                      className="px-3 py-2.5 text-left text-[10px] font-semibold text-text-tertiary uppercase tracking-wider cursor-pointer hover:text-text-primary whitespace-nowrap">
                      {h}
                      {sortCol === h && <span className="ml-1">{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, i) => (
                  <tr key={row._rowIndex || i}
                    onClick={() => handleRowClick(row)}
                    className={`border-b border-border/30 cursor-pointer transition-all hover:bg-violet-50/50 ${
                      selectedRow?._rowIndex === row._rowIndex ? 'bg-violet-50' : ''
                    }`}>
                    {headers.map(h => {
                      const val = row[h] || '';
                      const isStatus = h === statusColumn;
                      const isPrice = isPriceColumn(h);
                      return (
                        <td key={h} className="px-3 py-2 whitespace-nowrap max-w-[200px] truncate">
                          {isStatus ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getStatusColor(val) }} />
                              <span className="font-medium">{val}</span>
                            </span>
                          ) : isPrice && val && !isNaN(parseFloat(String(val).replace(/[$,]/g, ''))) ? (
                            <span className="font-mono">{formatCurrency(parseFloat(String(val).replace(/[$,]/g, '')))}</span>
                          ) : (
                            <span className={h === addressColumn ? 'font-medium text-text-primary' : 'text-text-secondary'}>{val}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Map */}
        {showMap && (
          <div className="w-1/2 border-l border-border relative">
            <div ref={mapContainer} className="w-full h-full" />
            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md rounded-xl px-3 py-2 shadow-card text-[10px] space-y-1">
              {statusColumn && (
                <>
                  {Object.entries({ Lead: '#94a3b8', Review: '#f59e0b', LOI: '#3b82f6', DD: '#8b5cf6', Closed: '#10b981', Passed: '#ef4444' }).map(([k, c]) => (
                    <div key={k} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />
                      <span className="text-text-secondary">{k}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
