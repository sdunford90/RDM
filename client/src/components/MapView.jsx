import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';

const ACCENT = '#0E7490';

export default function MapView({ mapboxToken, center, parcelGeometry, parcelData }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const [mapStyle, setMapStyle] = useState('satellite');
  const [showParcel, setShowParcel] = useState(true);

  useEffect(() => {
    if (!mapboxToken || !mapContainer.current) return;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    mapboxgl.accessToken = mapboxToken;
    const styleUrl = mapStyle === 'satellite'
      ? 'mapbox://styles/mapbox/satellite-streets-v12'
      : 'mapbox://styles/mapbox/light-v11';

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: styleUrl,
      center: center ? [center.lng, center.lat] : [-96.7, 32.9],
      zoom: center ? 16 : 4,
      pitch: center ? 45 : 0
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    const geocoder = new MapboxGeocoder({
      accessToken: mapboxToken,
      mapboxgl,
      placeholder: 'Search location...',
      countries: 'us'
    });
    map.addControl(geocoder, 'top-left');

    map.on('load', () => {
      if (parcelGeometry && showParcel) {
        map.addSource('parcel', { type: 'geojson', data: { type: 'Feature', geometry: parcelGeometry } });
        map.addLayer({ id: 'parcel-fill',    type: 'fill', source: 'parcel', paint: { 'fill-color': ACCENT, 'fill-opacity': 0.18 } });
        map.addLayer({ id: 'parcel-outline', type: 'line', source: 'parcel', paint: { 'line-color': ACCENT, 'line-width': 2 } });

        map.on('click', 'parcel-fill', () => {
          if (!parcelData) return;
          new mapboxgl.Popup({ closeButton: true, className: 'parcel-popup' })
            .setLngLat(center ? [center.lng, center.lat] : [0, 0])
            .setHTML(`
              <div style="font-family:Inter,sans-serif;color:#0F172A;background:#FFFFFF;padding:12px;border-radius:8px;min-width:200px;border:1px solid #E5E7EB">
                <strong style="color:${ACCENT}">${parcelData.owner || 'Unknown Owner'}</strong><br/>
                <span style="font-size:11px;color:#64748B">APN: ${parcelData.apn || 'N/A'}</span><br/>
                <span style="font-size:11px;color:#64748B">Acreage: ${parcelData.acreage || 'N/A'}</span><br/>
                <span style="font-size:11px;color:#64748B">Zoning: ${parcelData.zoning || 'N/A'}</span>
              </div>
            `)
            .addTo(map);
        });
        map.on('mouseenter', 'parcel-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'parcel-fill', () => { map.getCanvas().style.cursor = ''; });
      }

      if (center) {
        new mapboxgl.Marker({ color: ACCENT })
          .setLngLat([center.lng, center.lat])
          .addTo(map);
      }
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [mapboxToken, mapStyle, center, parcelGeometry, showParcel, parcelData]);

  const flyToProperty = () => {
    if (mapRef.current && center) {
      mapRef.current.flyTo({ center: [center.lng, center.lat], zoom: 17, pitch: 60, duration: 2000 });
    }
  };

  return (
    <div className="h-full relative bg-canvas">
      <div ref={mapContainer} className="w-full h-full" />

      <div className="absolute bottom-6 left-6 flex gap-2 z-10">
        <button
          onClick={() => setMapStyle(mapStyle === 'satellite' ? 'light' : 'satellite')}
          className="px-3 py-1.5 bg-surface border border-hairline rounded text-xs text-ink-2 shadow-card hover:border-accent transition-colors"
        >
          {mapStyle === 'satellite' ? '🗺️ Street' : '🛰️ Satellite'}
        </button>
        <button
          onClick={() => setShowParcel(!showParcel)}
          className={`px-3 py-1.5 border rounded text-xs shadow-card transition-colors ${
            showParcel
              ? 'bg-accent-subtle border-accent text-accent'
              : 'bg-surface border-hairline text-ink-2 hover:border-accent'
          }`}
        >
          Parcel Boundary
        </button>
        {center && (
          <button
            onClick={flyToProperty}
            className="px-3 py-1.5 bg-accent text-white rounded text-xs font-medium hover:bg-accent-hover shadow-card transition-colors"
          >
            Fly to Property
          </button>
        )}
      </div>

      {!mapboxToken && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface">
          <p className="text-ink-3">Configure MAPBOX_TOKEN to enable map</p>
        </div>
      )}
    </div>
  );
}
