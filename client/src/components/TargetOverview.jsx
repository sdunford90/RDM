import React, { useState, useRef, useEffect } from 'react';
import { formatCurrency, formatPercent, formatNumber } from '../utils/formatters';
import MarketCharts from './MarketCharts';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';

export default function TargetOverview({ mapboxToken, onAnalyze, parcelData, marketData, loading, mapCenter, parcelGeometry, notes, onNotesChange }) {
  const [address, setAddress] = useState('');
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const geocoderRef = useRef(null);
  const geocoderContainer = useRef(null);

  useEffect(() => {
    if (!mapboxToken || !mapContainer.current || mapRef.current) return;
    if (!mapboxgl.supported()) return;
    let map, geocoder;
    try {
      mapboxgl.accessToken = mapboxToken;
      map = new mapboxgl.Map({ container: mapContainer.current, style: 'mapbox://styles/mapbox/satellite-streets-v12', center: [-96.7, 32.9], zoom: 4 });
      map.addControl(new mapboxgl.NavigationControl(), 'top-right');
      geocoder = new MapboxGeocoder({ accessToken: mapboxToken, mapboxgl, placeholder: 'Search address...', countries: 'us', types: 'address,poi,place' });
      if (geocoderContainer.current) { geocoderContainer.current.innerHTML = ''; geocoderContainer.current.appendChild(geocoder.onAdd(map)); }
      geocoder.on('result', (e) => { const { center, place_name } = e.result; setAddress(place_name); onAnalyze(place_name, { lat: center[1], lng: center[0] }); });
      mapRef.current = map; geocoderRef.current = geocoder;
    } catch (err) { if (map) try { map.remove(); } catch (_) {} return; }
    return () => {
      try { geocoderRef.current?.onRemove(); } catch (_) {} geocoderRef.current = null;
      if (geocoderContainer.current) geocoderContainer.current.innerHTML = '';
      if (mapRef.current) { try { mapRef.current.remove(); } catch (_) {} mapRef.current = null; }
    };
  }, [mapboxToken]);

  useEffect(() => {
    if (!mapRef.current || !mapCenter) return;
    mapRef.current.flyTo({ center: [mapCenter.lng, mapCenter.lat], zoom: 16, pitch: 45, duration: 2000 });
    new mapboxgl.Marker({ color: '#7c3aed' }).setLngLat([mapCenter.lng, mapCenter.lat]).addTo(mapRef.current);
  }, [mapCenter]);

  useEffect(() => {
    if (!mapRef.current || !parcelGeometry) return;
    const map = mapRef.current;
    const add = () => {
      if (map.getSource('parcel')) { map.removeLayer('parcel-fill'); map.removeLayer('parcel-outline'); map.removeSource('parcel'); }
      map.addSource('parcel', { type: 'geojson', data: { type: 'Feature', geometry: parcelGeometry } });
      map.addLayer({ id: 'parcel-fill', type: 'fill', source: 'parcel', paint: { 'fill-color': '#7c3aed', 'fill-opacity': 0.15 } });
      map.addLayer({ id: 'parcel-outline', type: 'line', source: 'parcel', paint: { 'line-color': '#a855f7', 'line-width': 2.5 } });
    };
    if (map.isStyleLoaded()) add(); else map.on('load', add);
  }, [parcelGeometry]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!address.trim() || !mapboxToken) return;
    fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxToken}&country=us`)
      .then(r => r.json()).then(data => { if (data.features?.length > 0) { const [lng, lat] = data.features[0].center; onAnalyze(address, { lat, lng }); } });
  };

  const p = parcelData, m = marketData;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-108px)]">
      {/* Left panel */}
      <div className="lg:w-[42%] overflow-y-auto p-5 space-y-4 bg-white border-r border-border">
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div ref={geocoderContainer} className="w-full" />
          <div className="flex gap-2">
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Or type address manually..."
              className="flex-1 bg-surface-1 border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent focus:shadow-input-focus transition-all" />
            <button type="submit" disabled={loading}
              className="px-6 py-2.5 bg-gradient-brand text-white rounded-xl font-semibold text-sm shadow-glow-violet hover:opacity-90 transition-all disabled:opacity-50">
              {loading ? <span className="flex items-center gap-2"><Spinner />Analyzing</span> : 'Analyze'}
            </button>
          </div>
        </form>

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-brand-soft flex items-center justify-center"><Spinner size="lg" /></div>
            <span className="text-text-tertiary text-sm">Pulling property data...</span>
          </div>
        )}

        {p && !p.error && (
          <>
            {/* Property header */}
            <div className="bg-gradient-card rounded-2xl p-5 border border-violet-100 shadow-card">
              <h2 className="text-[15px] font-bold text-text-primary">{p.identity?.location_name || p.identity?.address || 'Property'}</h2>
              <p className="text-xs text-text-tertiary mt-1">{[p.identity?.address, p.identity?.scity, p.identity?.state2, p.identity?.szip].filter(Boolean).join(', ')}</p>
              {p.identity?.county && <p className="text-xs text-text-tertiary">{p.identity.county} County</p>}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {p.federal?.qoz === 'Yes' && <Badge color="green">Opportunity Zone</Badge>}
                {p.federal?.fema_flood_zone && ['AE','VE','A','V'].includes(p.federal.fema_flood_zone) && <Badge color="red">Flood Zone {p.federal.fema_flood_zone}</Badge>}
                {p.nonArmsLength && <Badge color="amber">Non-Arms-Length</Badge>}
                {p.ownership?.owntype && p.ownership.owntype !== 'Individual' && <Badge color="blue">{p.ownership.owntype}</Badge>}
              </div>
            </div>

            <Sec title="Identity" color="violet">
              <D label="Parcel APN" value={p.identity?.parcelnumb} /><D label="State ID" value={p.identity?.state_parcelnumb} />
              <D label="Tax Account" value={p.identity?.account_number} /><D label="FIPS" value={p.identity?.geoid} />
              <D label="Coordinates" value={p.identity?.lat && p.identity?.lon ? `${p.identity.lat}, ${p.identity.lon}` : null} />
              <D label="Refresh" value={p.identity?.ll_last_refresh} />
              {p.identity?.sourceurl && <div className="col-span-2"><a href={p.identity.sourceurl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-accent hover:text-accent-dark underline decoration-accent/30">View County Record</a></div>}
            </Sec>

            <Sec title="Ownership" color="pink">
              <D label="Owner" value={p.ownership?.owner} accent /><D label="Type" value={p.ownership?.owntype} />
              {(p.ownership?.ownfrst || p.ownership?.ownlast) && <D label="Name" value={`${p.ownership.ownfrst||''} ${p.ownership.ownlast||''}`.trim()} />}
              {p.ownership?.owner2 && <D label="Co-Owner" value={p.ownership.owner2} />}
              <D label="Prev Owner" value={p.sale?.previous_owner} />
              <D label="Mailing" value={[p.ownership?.mailadd, p.ownership?.mail_city, p.ownership?.mail_state2, p.ownership?.mail_zip].filter(Boolean).join(', ') || null} full />
            </Sec>

            {p.enhanced_ownership?.eo_owner && (
              <Sec title="Deed Records" color="orange">
                <D label="Deed Owner" value={p.enhanced_ownership.eo_owner} accent />
                <D label="Grantee" value={p.enhanced_ownership.eo_deedowner} />
                {p.enhanced_ownership.eo_owner !== p.ownership?.owner && <Alert>Deed owner differs from assessor</Alert>}
              </Sec>
            )}

            <Sec title="Sale & Transfer" color="teal">
              <D label="Sale Price" value={p.sale?.saleprice ? formatCurrency(p.sale.saleprice) : null} accent />
              <D label="Sale Date" value={p.sale?.saledate} /><D label="Transfer" value={p.sale?.last_ownership_transfer_date} />
              {p.nonArmsLength && <Alert>Non-arms-length transfer — price may not reflect market</Alert>}
            </Sec>

            <Sec title="Tax & Valuation" color="emerald">
              <D label="Assessed" value={p.tax?.parval ? formatCurrency(p.tax.parval) : null} accent />
              <D label="Land" value={p.tax?.landval ? formatCurrency(p.tax.landval) : null} />
              <D label="Improvements" value={p.tax?.improvval ? formatCurrency(p.tax.improvval) : null} />
              {p.tax?.agval && <><D label="Ag Value" value={formatCurrency(p.tax.agval)} /><Alert>Ag exemption on commercial land</Alert></>}
              <D label="Tax Bill" value={p.tax?.taxamt ? formatCurrency(p.tax.taxamt) : null} accent />
              <D label="Year" value={p.tax?.taxyear} />
            </Sec>

            <Sec title="Physical" color="sky">
              <D label="Acreage" value={p.physical?.ll_gisacre ? `${p.physical.ll_gisacre} ac` : null} accent />
              <D label="Building" value={p.physical?.area_building ? `${formatNumber(p.physical.area_building)} sf` : null} />
              <D label="Structures" value={p.physical?.structno} /><D label="Year Built" value={p.physical?.yearbuilt} />
              <D label="Units" value={p.physical?.numunits} /><D label="Style" value={p.physical?.structstyle} />
            </Sec>

            <Sec title="Zoning" color="amber">
              <D label="Use" value={p.landuse?.usedesc} accent /><D label="Zoning" value={p.landuse?.zoning} />
              <D label="Description" value={p.landuse?.zoning_description} /><D label="Legal" value={p.landuse?.legaldesc} full />
            </Sec>

            <Sec title="Federal" color="rose">
              <D label="Opp Zone" value={p.federal?.qoz} /><D label="Flood Zone" value={p.federal?.fema_flood_zone} />
              {p.federal?.fema_nri_risk_rating && <D label="Hazard Risk" value={p.federal.fema_nri_risk_rating} />}
              <D label="Census" value={p.federal?.census_tract} />
            </Sec>

            {hasAny(p.premium) && (
              <Sec title="Premium Data" color="indigo">
                {p.premium?.zoning_type && <D label="Std Zoning" value={p.premium.zoning_type} />}
                {p.premium?.ll_bldg_footprint_sqft && <D label="Footprint" value={`${formatNumber(p.premium.ll_bldg_footprint_sqft)} sf`} />}
                {p.premium?.elevation_highest && <D label="High Elev" value={`${p.premium.elevation_highest}m`} />}
                {p.premium?.elevation_lowest && <D label="Low Elev" value={`${p.premium.elevation_lowest}m`} />}
              </Sec>
            )}
          </>
        )}

        {p?.error && <Empty>{p.error}. Enter data manually in Underwriting.</Empty>}

        {m && !m.error && (
          <>
            <Sec title="STR Market" color="fuchsia">
              <D label="ADR" value={m.summary?.avg_daily_rate || m.avg_daily_rate ? `$${m.summary?.avg_daily_rate || m.avg_daily_rate}/nt` : null} accent />
              <D label="Occupancy" value={m.summary?.avg_occupancy || m.avg_occupancy ? formatPercent(m.summary?.avg_occupancy || m.avg_occupancy) : null} accent />
              <D label="Monthly Rev" value={m.summary?.avg_monthly_revenue || m.avg_monthly_revenue ? formatCurrency(m.summary?.avg_monthly_revenue || m.avg_monthly_revenue) : null} />
              <D label="Listings" value={m.summary?.active_listings || m.active_listings ? formatNumber(m.summary?.active_listings || m.active_listings) : null} />
              {m.metrics?.revpar?.value && <D label="RevPAR" value={`$${m.metrics.revpar.value}`} />}
              <D label="Radius" value={`${m.radius_miles || 10} mi`} />
            </Sec>

            {m.estimate && (
              <Sec title="Revenue Estimate" color="emerald">
                <D label="Annual Rev" value={m.estimate.projected_annual_revenue ? formatCurrency(m.estimate.projected_annual_revenue) : null} accent />
                <D label="Est ADR" value={m.estimate.projected_adr ? `$${m.estimate.projected_adr}/nt` : null} accent />
                <D label="Est Occ" value={m.estimate.projected_occupancy ? formatPercent(m.estimate.projected_occupancy) : null} accent />
                <D label="Comps" value={m.estimate.comp_count} />
              </Sec>
            )}

            {m.listing && (
              <Sec title="Active Listing" color="cyan">
                <D label="ID" value={m.listing.listing_id} />
                {m.listing.listing_data?.avg_review_score && <D label="Rating" value={`${m.listing.listing_data.avg_review_score}/5`} />}
                {m.listing.listing_data?.review_count && <D label="Reviews" value={m.listing.listing_data.review_count} />}
              </Sec>
            )}

            <MarketCharts metrics={m.metrics} estimate={m.estimate} />
          </>
        )}

        {m?.error && <Empty>{m.error}. Enter STR data in Underwriting.</Empty>}

        <div className="space-y-2 pb-4">
          <h3 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Notes</h3>
          <textarea value={notes} onChange={(e) => onNotesChange(e.target.value)} placeholder="Diligence notes..."
            className="w-full h-24 bg-surface-1 border border-border rounded-2xl px-4 py-3 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent focus:shadow-input-focus resize-none transition-all" />
        </div>
      </div>

      {/* Map */}
      <div className="lg:w-[58%] h-full relative bg-surface-2">
        <div ref={mapContainer} className="w-full h-full" />
        {!mapboxToken && <Overlay>Configure MAPBOX_TOKEN to enable map</Overlay>}
        {mapboxToken && !mapboxgl.supported() && <Overlay>WebGL required — use a full browser tab</Overlay>}
      </div>
    </div>
  );
}

function hasAny(obj) { return obj && Object.values(obj).some(v => v != null); }

function Spinner({ size = 'sm' }) {
  const s = size === 'lg' ? 'h-5 w-5' : 'h-3.5 w-3.5';
  return <div className={`animate-spin rounded-full ${s} border-2 border-accent border-t-transparent`} />;
}

function Overlay({ children }) { return <div className="absolute inset-0 flex items-center justify-center bg-surface-2"><p className="text-text-tertiary text-sm">{children}</p></div>; }

const sectionColors = {
  violet: 'border-l-violet-400', pink: 'border-l-pink-400', orange: 'border-l-orange-400',
  teal: 'border-l-teal-400', emerald: 'border-l-emerald-400', sky: 'border-l-sky-400',
  amber: 'border-l-amber-400', rose: 'border-l-rose-400', indigo: 'border-l-indigo-400',
  fuchsia: 'border-l-fuchsia-400', cyan: 'border-l-cyan-400',
};

function Sec({ title, children, color = 'violet' }) {
  return (
    <div className={`space-y-2 pl-3 border-l-2 ${sectionColors[color] || sectionColors.violet}`}>
      <h3 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">{title}</h3>
      <div className="grid grid-cols-2 gap-1.5">{children}</div>
    </div>
  );
}

function D({ label, value, accent, full }) {
  if (value == null) return null;
  return (
    <div className={`bg-surface-1 rounded-xl px-3 py-2.5 ${full ? 'col-span-2' : ''}`}>
      <p className="text-[10px] text-text-tertiary uppercase tracking-wider leading-none mb-1">{label}</p>
      <p className={`text-[13px] font-mono leading-tight break-words ${accent ? 'text-accent font-semibold' : 'text-text-primary'}`}>{String(value)}</p>
    </div>
  );
}

function Badge({ color, children }) {
  const c = { green: 'bg-emerald-50 text-emerald-600 border-emerald-200', red: 'bg-red-50 text-red-600 border-red-200', amber: 'bg-amber-50 text-amber-600 border-amber-200', blue: 'bg-blue-50 text-blue-600 border-blue-200' };
  return <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${c[color] || c.blue}`}>{children}</span>;
}

function Alert({ children }) { return <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2"><p className="text-[11px] text-amber-700 font-medium">{children}</p></div>; }
function Empty({ children }) { return <div className="bg-surface-1 border border-border rounded-2xl p-4 text-sm text-text-tertiary">{children}</div>; }
