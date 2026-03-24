import React, { useState, useRef, useEffect } from 'react';
import { formatCurrency, formatPercent, formatNumber } from '../utils/formatters';
import OccupancyChart from './OccupancyChart';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';

export default function TargetOverview({ mapboxToken, onAnalyze, parcelData, marketData, loading, mapCenter, parcelGeometry, notes, onNotesChange }) {
  const [address, setAddress] = useState('');
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const geocoderContainer = useRef(null);

  // Initialize mini map
  useEffect(() => {
    if (!mapboxToken || !mapContainer.current) return;
    if (mapRef.current) return;

    if (!mapboxgl.supported()) {
      console.warn('Mapbox GL is not supported in this environment (WebGL unavailable).');
      return;
    }

    let map;
    try {
      mapboxgl.accessToken = mapboxToken;
      map = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: [-96.7, 32.9],
        zoom: 4
      });

      map.addControl(new mapboxgl.NavigationControl(), 'top-right');

      const geocoder = new MapboxGeocoder({
        accessToken: mapboxToken,
        mapboxgl: mapboxgl,
        placeholder: 'Search address...',
        countries: 'us',
        types: 'address,poi,place'
      });

      if (geocoderContainer.current) {
        geocoderContainer.current.appendChild(geocoder.onAdd(map));
      }

      geocoder.on('result', (e) => {
        const { center, place_name } = e.result;
        setAddress(place_name);
        onAnalyze(place_name, { lat: center[1], lng: center[0] });
      });

      mapRef.current = map;
    } catch (err) {
      console.warn('Failed to initialize map:', err);
      if (map) { try { map.remove(); } catch (_) {} }
      return;
    }

    return () => {
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch (_) {}
        mapRef.current = null;
      }
    };
  }, [mapboxToken]);

  // Fly to location when center changes
  useEffect(() => {
    if (!mapRef.current || !mapCenter) return;
    mapRef.current.flyTo({
      center: [mapCenter.lng, mapCenter.lat],
      zoom: 16,
      pitch: 45,
      duration: 2000
    });

    // Add marker
    new mapboxgl.Marker({ color: '#C9A84C' })
      .setLngLat([mapCenter.lng, mapCenter.lat])
      .addTo(mapRef.current);
  }, [mapCenter]);

  // Add parcel boundary
  useEffect(() => {
    if (!mapRef.current || !parcelGeometry) return;
    const map = mapRef.current;

    const addLayer = () => {
      if (map.getSource('parcel')) {
        map.removeLayer('parcel-fill');
        map.removeLayer('parcel-outline');
        map.removeSource('parcel');
      }
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
    };

    if (map.isStyleLoaded()) addLayer();
    else map.on('load', addLayer);
  }, [parcelGeometry]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!address.trim()) return;
    // Geocode via mapbox
    if (mapboxToken) {
      fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxToken}&country=us`)
        .then(r => r.json())
        .then(data => {
          if (data.features && data.features.length > 0) {
            const [lng, lat] = data.features[0].center;
            onAnalyze(address, { lat, lng });
          }
        });
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-100px)]">
      {/* Left panel */}
      <div className="lg:w-[40%] overflow-y-auto p-6 space-y-5 border-r border-navy-700">
        {/* Address input */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div ref={geocoderContainer} className="w-full" />
          <div className="flex gap-2">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Or type address manually..."
              className="flex-1 bg-navy-900 border border-navy-700 rounded-lg px-4 py-2.5 text-sm text-slate-text placeholder-slate-secondary focus:outline-none focus:border-gold"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-gold hover:bg-gold-light text-navy-900 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
        </form>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
            <span className="ml-3 text-slate-secondary text-sm">Fetching property data...</span>
          </div>
        )}

        {/* Parcel Data */}
        {parcelData && !parcelData.error && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gold uppercase tracking-wider">Parcel Data</h3>
            <div className="grid grid-cols-2 gap-2">
              <DataCard label="Owner of Record" value={parcelData.owner} />
              <DataCard label="Parcel APN" value={parcelData.apn} />
              <DataCard label="Acreage" value={parcelData.acreage} />
              <DataCard label="Assessed Value" value={parcelData.assessed_value !== 'N/A' ? formatCurrency(parcelData.assessed_value) : 'N/A'} />
              <DataCard label="Land Value" value={parcelData.land_value !== 'N/A' ? formatCurrency(parcelData.land_value) : 'N/A'} />
              <DataCard label="Improvement Value" value={parcelData.improvement_value !== 'N/A' ? formatCurrency(parcelData.improvement_value) : 'N/A'} />
              <DataCard label="Zoning" value={parcelData.zoning} />
              <DataCard label="County" value={parcelData.county} />
              <DataCard label="Last Sale Date" value={parcelData.last_sale_date} />
              <DataCard label="Last Sale Price" value={parcelData.last_sale_price !== 'N/A' ? formatCurrency(parcelData.last_sale_price) : 'N/A'} />
              <DataCard label="Flood Zone" value={parcelData.flood_zone} full />
              <DataCard label="Legal Description" value={parcelData.legal_description} full />
            </div>
          </div>
        )}

        {parcelData?.error && (
          <div className="bg-navy-800 border border-navy-700 rounded-lg p-4 text-sm text-slate-secondary">
            {parcelData.error}. You can enter data manually in the Underwriting tab.
          </div>
        )}

        {/* Market Data */}
        {marketData && !marketData.error && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gold uppercase tracking-wider">STR Market Data</h3>
            <div className="grid grid-cols-2 gap-2">
              <DataCard label="Active Listings" value={marketData.active_listings ? formatNumber(marketData.active_listings) : 'N/A'} />
              <DataCard label="Avg ADR" value={marketData.avg_daily_rate ? `$${marketData.avg_daily_rate}/night` : 'N/A'} highlight />
              <DataCard label="Avg Occupancy" value={marketData.avg_occupancy ? formatPercent(marketData.avg_occupancy) : 'N/A'} highlight />
              <DataCard label="Avg Monthly Revenue" value={marketData.avg_monthly_revenue ? formatCurrency(marketData.avg_monthly_revenue) : 'N/A'} />
              <DataCard label="Market Score" value={marketData.market_score || 'N/A'} />
              <DataCard label="Data Radius" value={`${marketData.radius_miles || 10} miles`} />
            </div>
            {marketData.monthly_data && (
              <OccupancyChart data={marketData.monthly_data} />
            )}
          </div>
        )}

        {marketData?.error && (
          <div className="bg-navy-800 border border-navy-700 rounded-lg p-4 text-sm text-slate-secondary">
            {marketData.error}. You can enter STR data manually in the Underwriting tab.
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gold uppercase tracking-wider">Notes</h3>
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Add diligence notes..."
            className="w-full h-28 bg-navy-900 border border-navy-700 rounded-lg px-4 py-3 text-sm text-slate-text placeholder-slate-secondary focus:outline-none focus:border-gold resize-none"
          />
        </div>
      </div>

      {/* Right panel — Map */}
      <div className="lg:w-[60%] h-full relative">
        <div ref={mapContainer} className="w-full h-full" />
        {!mapboxToken && (
          <div className="absolute inset-0 flex items-center justify-center bg-navy-800">
            <p className="text-slate-secondary text-sm">Configure MAPBOX_TOKEN to enable map view</p>
          </div>
        )}
        {mapboxToken && !mapboxgl.supported() && (
          <div className="absolute inset-0 flex items-center justify-center bg-navy-800">
            <p className="text-slate-secondary text-sm">Map requires WebGL — open the app in a full browser tab to view the map</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DataCard({ label, value, highlight, full }) {
  return (
    <div className={`bg-navy-800 border border-navy-700 rounded-lg p-3 ${full ? 'col-span-2' : ''}`}>
      <p className="text-[10px] text-slate-secondary uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-sm font-mono ${highlight ? 'text-gold font-semibold' : 'text-slate-text'}`}>
        {value || 'N/A'}
      </p>
    </div>
  );
}
