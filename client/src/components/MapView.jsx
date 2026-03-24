import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';

export default function MapView({ mapboxToken, center, parcelGeometry, parcelData }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const [mapStyle, setMapStyle] = useState('satellite');
  const [showParcel, setShowParcel] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  useEffect(() => {
    if (!mapboxToken || !mapContainer.current) return;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    mapboxgl.accessToken = mapboxToken;
    const styleUrl = mapStyle === 'satellite'
      ? 'mapbox://styles/mapbox/satellite-streets-v12'
      : 'mapbox://styles/mapbox/dark-v11';

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: styleUrl,
      center: center ? [center.lng, center.lat] : [-96.7, 32.9],
      zoom: center ? 16 : 4,
      pitch: center ? 45 : 0
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    // Search box
    const geocoder = new MapboxGeocoder({
      accessToken: mapboxToken,
      mapboxgl: mapboxgl,
      placeholder: 'Search location...',
      countries: 'us'
    });
    map.addControl(geocoder, 'top-left');

    map.on('load', () => {
      // Add parcel boundary
      if (parcelGeometry && showParcel) {
        map.addSource('parcel', {
          type: 'geojson',
          data: { type: 'Feature', geometry: parcelGeometry }
        });
        map.addLayer({
          id: 'parcel-fill',
          type: 'fill',
          source: 'parcel',
          paint: { 'fill-color': '#C9A84C', 'fill-opacity': 0.2 }
        });
        map.addLayer({
          id: 'parcel-outline',
          type: 'line',
          source: 'parcel',
          paint: { 'line-color': '#C9A84C', 'line-width': 2 }
        });

        // Click popup
        map.on('click', 'parcel-fill', () => {
          if (!parcelData) return;
          new mapboxgl.Popup({ closeButton: true, className: 'parcel-popup' })
            .setLngLat(center ? [center.lng, center.lat] : [0, 0])
            .setHTML(`
              <div style="font-family:Inter,sans-serif;color:#E8EDF5;background:#1A2236;padding:12px;border-radius:8px;min-width:200px">
                <strong style="color:#C9A84C">${parcelData.owner || 'Unknown Owner'}</strong><br/>
                <span style="font-size:11px;color:#8A9BBE">APN: ${parcelData.apn || 'N/A'}</span><br/>
                <span style="font-size:11px;color:#8A9BBE">Acreage: ${parcelData.acreage || 'N/A'}</span><br/>
                <span style="font-size:11px;color:#8A9BBE">Zoning: ${parcelData.zoning || 'N/A'}</span>
              </div>
            `)
            .addTo(map);
        });
        map.on('mouseenter', 'parcel-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'parcel-fill', () => { map.getCanvas().style.cursor = ''; });
      }

      // Marker
      if (center) {
        new mapboxgl.Marker({ color: '#C9A84C' })
          .setLngLat([center.lng, center.lat])
          .addTo(map);
      }
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [mapboxToken, mapStyle, center, parcelGeometry, showParcel]);

  const flyToProperty = () => {
    if (mapRef.current && center) {
      mapRef.current.flyTo({
        center: [center.lng, center.lat],
        zoom: 17,
        pitch: 60,
        duration: 2000
      });
    }
  };

  return (
    <div className="h-[calc(100vh-100px)] relative">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Controls overlay */}
      <div className="absolute bottom-6 left-6 flex gap-2 z-10">
        <button
          onClick={() => setMapStyle(mapStyle === 'satellite' ? 'dark' : 'satellite')}
          className="px-3 py-1.5 bg-navy-800 border border-navy-700 rounded text-xs text-slate-text hover:border-gold transition-colors"
        >
          {mapStyle === 'satellite' ? '🗺️ Street' : '🛰️ Satellite'}
        </button>
        <button
          onClick={() => setShowParcel(!showParcel)}
          className={`px-3 py-1.5 border rounded text-xs transition-colors ${
            showParcel
              ? 'bg-gold/20 border-gold text-gold'
              : 'bg-navy-800 border-navy-700 text-slate-text hover:border-gold'
          }`}
        >
          Parcel Boundary
        </button>
        {center && (
          <button
            onClick={flyToProperty}
            className="px-3 py-1.5 bg-gold text-navy-900 rounded text-xs font-medium hover:bg-gold-light transition-colors"
          >
            Fly to Property
          </button>
        )}
      </div>

      {!mapboxToken && (
        <div className="absolute inset-0 flex items-center justify-center bg-navy-800">
          <p className="text-slate-secondary">Configure MAPBOX_TOKEN to enable map</p>
        </div>
      )}
    </div>
  );
}
