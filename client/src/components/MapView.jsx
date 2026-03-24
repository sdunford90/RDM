import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';

export default function MapView({ mapboxToken, center, parcelGeometry, parcelData }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const [mapStyle, setMapStyle] = useState('satellite');
  const [showParcel, setShowParcel] = useState(true);

  useEffect(() => {
    if (!mapboxToken || !mapContainer.current) return;
    if (!mapboxgl.supported()) return;
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

    mapboxgl.accessToken = mapboxToken;
    const style = mapStyle === 'satellite' ? 'mapbox://styles/mapbox/satellite-streets-v12' : 'mapbox://styles/mapbox/dark-v11';
    let map;
    try {
      map = new mapboxgl.Map({ container: mapContainer.current, style, center: center ? [center.lng, center.lat] : [-96.7, 32.9], zoom: center ? 16 : 4, pitch: center ? 45 : 0 });
      map.addControl(new mapboxgl.NavigationControl(), 'top-right');
      map.addControl(new mapboxgl.FullscreenControl(), 'top-right');
      map.addControl(new MapboxGeocoder({ accessToken: mapboxToken, mapboxgl, placeholder: 'Search...', countries: 'us' }), 'top-left');

      map.on('load', () => {
        if (parcelGeometry && showParcel) {
          map.addSource('parcel', { type: 'geojson', data: { type: 'Feature', geometry: parcelGeometry } });
          map.addLayer({ id: 'parcel-fill', type: 'fill', source: 'parcel', paint: { 'fill-color': '#6366f1', 'fill-opacity': 0.15 } });
          map.addLayer({ id: 'parcel-outline', type: 'line', source: 'parcel', paint: { 'line-color': '#818cf8', 'line-width': 2 } });
          map.on('click', 'parcel-fill', () => {
            if (!parcelData) return;
            const owner = parcelData.ownership?.owner || 'Unknown';
            const apn = parcelData.identity?.parcelnumb || 'N/A';
            const acres = parcelData.physical?.ll_gisacre || 'N/A';
            new mapboxgl.Popup({ closeButton: true })
              .setLngLat(center ? [center.lng, center.lat] : [0, 0])
              .setHTML(`<div style="font-family:Inter,system-ui;color:#fafafa;background:#18181b;padding:12px;border-radius:10px;min-width:180px;border:1px solid #27272a"><strong style="color:#a5b4fc">${owner}</strong><br/><span style="font-size:11px;color:#71717a">APN: ${apn} &bull; ${acres} ac</span></div>`)
              .addTo(map);
          });
          map.on('mouseenter', 'parcel-fill', () => map.getCanvas().style.cursor = 'pointer');
          map.on('mouseleave', 'parcel-fill', () => map.getCanvas().style.cursor = '');
        }
        if (center) new mapboxgl.Marker({ color: '#6366f1' }).setLngLat([center.lng, center.lat]).addTo(map);
      });
      mapRef.current = map;
    } catch (err) { if (map) try { map.remove(); } catch (_) {} }
    return () => { if (mapRef.current) { try { mapRef.current.remove(); } catch (_) {} mapRef.current = null; } };
  }, [mapboxToken, mapStyle, center, parcelGeometry, showParcel]);

  return (
    <div className="h-[calc(100vh-108px)] relative">
      <div ref={mapContainer} className="w-full h-full" />
      <div className="absolute bottom-5 left-5 flex gap-2 z-10">
        <Pill onClick={() => setMapStyle(mapStyle === 'satellite' ? 'dark' : 'satellite')}>
          {mapStyle === 'satellite' ? 'Street View' : 'Satellite'}
        </Pill>
        <Pill active={showParcel} onClick={() => setShowParcel(!showParcel)}>Parcel</Pill>
        {center && <Pill accent onClick={() => mapRef.current?.flyTo({ center: [center.lng, center.lat], zoom: 17, pitch: 60, duration: 2000 })}>Fly to Property</Pill>}
      </div>
      {!mapboxToken && <div className="absolute inset-0 flex items-center justify-center bg-surface-1"><p className="text-text-tertiary text-sm">Configure MAPBOX_TOKEN</p></div>}
      {mapboxToken && !mapboxgl.supported() && <div className="absolute inset-0 flex items-center justify-center bg-surface-1"><p className="text-text-tertiary text-sm">WebGL required</p></div>}
    </div>
  );
}

function Pill({ children, onClick, active, accent }) {
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-md transition-all ${
      accent ? 'bg-accent text-white shadow-glow' :
      active ? 'bg-accent/20 text-accent-text border border-accent/30' :
      'bg-surface-1/80 text-text-secondary border border-border hover:border-border-hover'
    }`}>{children}</button>
  );
}
