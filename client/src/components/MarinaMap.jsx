import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';

const ACCENT = '#0E7490';

// Compact interactive map for the marina drawer. Satellite by default
// (best for visualizing slips, basins, breakwaters); switchable to a
// street view. Draws the parcel polygon if enrichment has returned one.

export default function MarinaMap({ mapboxToken, lat, lon, name, parcelGeometry }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [style, setStyle] = useState('satellite');

  useEffect(() => {
    if (!mapboxToken || !containerRef.current || lat == null || lon == null) return;

    mapboxgl.accessToken = mapboxToken;
    const styleUrl = style === 'satellite'
      ? 'mapbox://styles/mapbox/satellite-streets-v12'
      : 'mapbox://styles/mapbox/light-v11';

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: [lon, lat],
      zoom: 16,
      pitch: 0
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    map.on('load', () => {
      new mapboxgl.Marker({ color: ACCENT })
        .setLngLat([lon, lat])
        .setPopup(new mapboxgl.Popup({ offset: 24 }).setHTML(
          `<div style="font-family:Inter,sans-serif;color:#0F172A;padding:4px 6px;font-size:13px;font-weight:500">${escapeHtml(name || 'Marina')}</div>`
        ))
        .addTo(map);

      if (parcelGeometry) {
        map.addSource('parcel', { type: 'geojson', data: { type: 'Feature', geometry: parcelGeometry } });
        map.addLayer({ id: 'parcel-fill',    type: 'fill', source: 'parcel', paint: { 'fill-color': ACCENT, 'fill-opacity': 0.18 } });
        map.addLayer({ id: 'parcel-outline', type: 'line', source: 'parcel', paint: { 'line-color': ACCENT, 'line-width': 2 } });
      }
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [mapboxToken, lat, lon, style, parcelGeometry, name]);

  if (lat == null || lon == null) {
    return <div className="h-44 grid place-items-center text-sm text-ink-3 bg-canvas border border-hairline rounded-lg">No coordinates for this marina.</div>;
  }
  if (!mapboxToken) {
    return <div className="h-44 grid place-items-center text-sm text-ink-3 bg-canvas border border-hairline rounded-lg">Set MAPBOX_TOKEN in .env to enable maps.</div>;
  }

  const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;

  return (
    <div className="relative rounded-lg overflow-hidden border border-hairline" style={{ height: 240 }}>
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute bottom-2 left-2 flex gap-1.5 z-10 pointer-events-none">
        <button
          onClick={() => setStyle(s => s === 'satellite' ? 'light' : 'satellite')}
          className="pointer-events-auto px-2 py-1 bg-surface/95 border border-hairline rounded text-[11px] text-ink-2 shadow-card hover:border-accent"
        >
          {style === 'satellite' ? 'Street view' : 'Satellite'}
        </button>
        <a
          href={gmapsUrl}
          target="_blank" rel="noreferrer"
          className="pointer-events-auto px-2 py-1 bg-surface/95 border border-hairline rounded text-[11px] text-ink-2 shadow-card hover:border-accent"
        >
          Open in Google Maps ↗
        </a>
      </div>
    </div>
  );
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
