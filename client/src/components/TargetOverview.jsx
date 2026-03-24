import React, { useState, useRef, useEffect } from 'react';
import { formatCurrency, formatPercent, formatNumber } from '../utils/formatters';
import MarketCharts from './MarketCharts';
import MarketDeepDive from './MarketDeepDive';
import ListingDetail from './ListingDetail';
import InfoTip from './InfoTip';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';

export default function TargetOverview({ mapboxToken, onAnalyze, parcelData, marketData, adjacentParcels = [], adjacentParcelsLoading = false, strConfig = { bedrooms: 2, baths: 1, guests: 4 }, onStrConfigChange, onReestimate, loading, mapCenter, parcelGeometry, notes, onNotesChange }) {
  const [address, setAddress] = useState('');
  const [selectedListingId, setSelectedListingId] = useState(null);
  const [radius, setRadius] = useState(10);
  const radiusRef = useRef(10);
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
      geocoder.on('result', (e) => { const { center, place_name } = e.result; setAddress(place_name); onAnalyze(place_name, { lat: center[1], lng: center[0] }, radiusRef.current); });
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

  const [reestimating, setReestimating] = useState(false);

  // Draw adjacent parcel polygons on the Overview mini-map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const applyLayers = () => {
      // Remove old layers/source if present
      ['adj-fill', 'adj-outline'].forEach(id => { if (map.getLayer(id)) map.removeLayer(id); });
      if (map.getSource('adj-parcels')) map.removeSource('adj-parcels');

      if (!adjacentParcels.length) return;

      const features = adjacentParcels.filter(p => p.geometry).map(p => ({
        type: 'Feature', geometry: p.geometry,
        properties: { isRelated: p.isRelated || false }
      }));
      if (!features.length) return;

      map.addSource('adj-parcels', { type: 'geojson', data: { type: 'FeatureCollection', features } });
      map.addLayer({ id: 'adj-fill', type: 'fill', source: 'adj-parcels',
        paint: { 'fill-color': ['case', ['get', 'isRelated'], '#7c3aed', '#0ea5e9'], 'fill-opacity': ['case', ['get', 'isRelated'], 0.18, 0.08] }
      });
      map.addLayer({ id: 'adj-outline', type: 'line', source: 'adj-parcels',
        paint: { 'line-color': ['case', ['get', 'isRelated'], '#a855f7', '#38bdf8'], 'line-width': ['case', ['get', 'isRelated'], 2, 1], 'line-opacity': 0.7 }
      });
    };

    if (map.isStyleLoaded()) applyLayers(); else map.once('load', applyLayers);
  }, [adjacentParcels]);

  const handleReestimateClick = async (cfg) => {
    setReestimating(true);
    try { await onReestimate?.(cfg); } finally { setReestimating(false); }
  };

  const handleRadiusChange = (r) => { setRadius(r); radiusRef.current = r; };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!address.trim() || !mapboxToken) return;
    fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxToken}&country=us`)
      .then(r => r.json()).then(data => { if (data.features?.length > 0) { const [lng, lat] = data.features[0].center; onAnalyze(address, { lat, lng }, radiusRef.current); } });
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
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider flex items-center gap-1">
              STR Radius
              <InfoTip text="Geographic radius used to pull comparable STR listings from AirROI. Wider = more comps but less local precision. Re-analyze after changing." />
            </span>
            <div className="flex gap-1 ml-1">
              {[5, 10, 15, 25].map(r => (
                <button key={r} type="button" onClick={() => handleRadiusChange(r)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${radius === r ? 'bg-accent text-white shadow-sm' : 'bg-surface-1 text-text-tertiary border border-border hover:text-text-primary hover:border-accent/40'}`}>
                  {r} mi
                </button>
              ))}
            </div>
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
              <D label="ADR" value={m.summary?.avg_daily_rate || m.avg_daily_rate ? `$${m.summary?.avg_daily_rate || m.avg_daily_rate}/nt` : null} accent
                tooltip="Average Daily Rate — the average nightly price across active STRs within the search radius, based on trailing 12 months of booking data." />
              <D label="Occupancy" value={m.summary?.avg_occupancy || m.avg_occupancy ? formatPercent(m.summary?.avg_occupancy || m.avg_occupancy) : null} accent
                tooltip="Trailing 12-month average occupancy rate across active STRs in the radius. Higher = more nights booked per year." />
              <D label="Monthly Rev" value={m.summary?.avg_monthly_revenue || m.avg_monthly_revenue ? formatCurrency(m.summary?.avg_monthly_revenue || m.avg_monthly_revenue) : null}
                tooltip="Average gross monthly revenue per listing in the radius. This is actual performance from comparable active listings, not a projection." />
              <D label="Listings" value={m.summary?.active_listings || m.active_listings ? formatNumber(m.summary?.active_listings || m.active_listings) : null}
                tooltip="Number of active STR listings found within the search radius at the time of analysis. A small comp set may reduce reliability." />
              {m.metrics?.revpar?.value && <D label="RevPAR" value={`$${m.metrics.revpar.value}`}
                tooltip="Revenue Per Available Room — ADR × Occupancy. Combines rate and occupancy into one performance metric. Higher RevPAR = more efficient revenue generation." />}
              <D label="Radius" value={`${m.radius_miles || 10} mi`}
                tooltip="The search radius used to pull comparable STR listings. Adjust using the radius selector above and re-analyze to see a tighter or wider comp set." />
            </Sec>

            {m.estimate && (
              <div className="space-y-2">
                {/* Bed/bath/guests config row */}
                <div className="bg-surface-1 border border-border rounded-2xl px-3 py-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1">
                      Revenue Estimate Config
                      <InfoTip text="Adjust the unit configuration used to estimate STR revenue. The calculator uses comps with similar bedroom/bathroom counts near this location." />
                    </span>
                    <button onClick={() => handleReestimateClick(strConfig)} disabled={reestimating || !mapCenter}
                      className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold bg-gradient-brand text-white rounded-lg shadow-sm hover:opacity-90 transition-all disabled:opacity-40">
                      {reestimating ? <><Spinner />Running...</> : 'Re-run'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-semibold text-text-tertiary uppercase tracking-wider">Bedrooms</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(n => (
                          <button key={n} type="button"
                            onClick={() => { const c = { ...strConfig, bedrooms: n }; onStrConfigChange?.(c); }}
                            className={`w-7 h-7 rounded-lg text-[11px] font-semibold transition-all ${strConfig.bedrooms === n ? 'bg-accent text-white shadow-sm' : 'bg-white border border-border text-text-tertiary hover:border-accent/40 hover:text-text-primary'}`}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-semibold text-text-tertiary uppercase tracking-wider">Baths</span>
                      <div className="flex gap-1">
                        {[1, 1.5, 2, 2.5, 3].map(n => (
                          <button key={n} type="button"
                            onClick={() => { const c = { ...strConfig, baths: n }; onStrConfigChange?.(c); }}
                            className={`px-2 h-7 rounded-lg text-[11px] font-semibold transition-all ${strConfig.baths === n ? 'bg-accent text-white shadow-sm' : 'bg-white border border-border text-text-tertiary hover:border-accent/40 hover:text-text-primary'}`}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-semibold text-text-tertiary uppercase tracking-wider">Guests</span>
                      <div className="flex gap-1">
                        {[2, 4, 6, 8, 10].map(n => (
                          <button key={n} type="button"
                            onClick={() => { const c = { ...strConfig, guests: n }; onStrConfigChange?.(c); }}
                            className={`w-7 h-7 rounded-lg text-[11px] font-semibold transition-all ${strConfig.guests === n ? 'bg-accent text-white shadow-sm' : 'bg-white border border-border text-text-tertiary hover:border-accent/40 hover:text-text-primary'}`}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <Sec title={`Revenue Estimate · ${strConfig.bedrooms}BR/${strConfig.baths}BA/${strConfig.guests} guests`} color="emerald">
                  <D label="Annual Rev" value={m.estimate.projected_annual_revenue ? formatCurrency(m.estimate.projected_annual_revenue) : null} accent
                    tooltip="ML-projected gross annual revenue for a unit at this location based on the selected bed/bath/guest configuration. Based on AirROI's model trained on nearby comp performance." />
                  <D label="Est ADR" value={m.estimate.projected_adr ? `$${Math.round(m.estimate.projected_adr)}/nt` : null} accent
                    tooltip="ML-projected average nightly rate for the selected configuration. May differ from the market ADR above if nearby STRs vary significantly in size or type." />
                  <D label="Est Occ" value={m.estimate.projected_occupancy ? formatPercent(m.estimate.projected_occupancy) : null} accent
                    tooltip="ML-projected annual occupancy rate at this address. Based on comp performance and seasonal demand patterns." />
                  <D label="Comps" value={m.estimate.comp_count}
                    tooltip="Number of comparable listings the AirROI ML model used to generate this estimate. Fewer comps = lower confidence." />
                </Sec>
              </div>
            )}

            {m.listing && (
              <div className="space-y-2">
                <Sec title="Active Listing Found" color="cyan">
                  <D label="ID" value={m.listing.listing_id} />
                  {m.listing.listing_data?.avg_review_score && <D label="Rating" value={`${m.listing.listing_data.avg_review_score}/5`} />}
                  {m.listing.listing_data?.review_count && <D label="Reviews" value={m.listing.listing_data.review_count} />}
                </Sec>
                <button onClick={() => setSelectedListingId(m.listing.listing_id)}
                  className="w-full px-4 py-2 text-xs font-semibold bg-gradient-brand text-white rounded-xl shadow-glow-violet hover:opacity-90 transition-all">
                  View Full Listing Detail + Comps + Rates
                </button>
              </div>
            )}

            <MarketCharts metrics={m.metrics} estimate={m.estimate} />
          </>
        )}

        {m?.error && <Empty>{m.error}. Enter STR data in Underwriting.</Empty>}

        {/* Listing lookup — manual ID entry */}
        {(p || m) && (
          <div className="space-y-2">
            <h3 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider pl-3 border-l-2 border-l-cyan-400">Listing Lookup</h3>
            <div className="flex gap-2">
              <input type="text" placeholder="Enter Airbnb listing ID..."
                className="flex-1 bg-surface-1 border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent focus:shadow-input-focus transition-all"
                onKeyDown={(e) => { if (e.key === 'Enter' && e.target.value.trim()) { setSelectedListingId(e.target.value.trim()); } }} />
              <button onClick={() => {
                const input = document.querySelector('input[placeholder="Enter Airbnb listing ID..."]');
                if (input?.value.trim()) setSelectedListingId(input.value.trim());
              }} className="px-4 py-2 text-xs font-semibold bg-accent text-white rounded-xl hover:bg-accent-light transition-all">
                Look Up
              </button>
            </div>
          </div>
        )}

        {/* Listing detail panel */}
        {selectedListingId && (
          <ListingDetail listingId={selectedListingId} onClose={() => setSelectedListingId(null)} />
        )}

        {/* Market Deep Dive — always available when we have coordinates */}
        {mapCenter && (
          <MarketDeepDive lat={mapCenter.lat} lng={mapCenter.lng} marketData={m} />
        )}

        {/* Adjacent Parcels */}
        {adjacentParcels.length > 0 && (
          <AdjacentParcelsPanel adjacentParcels={adjacentParcels} parcelData={p} />
        )}
        {mapCenter && adjacentParcels.length === 0 && p && (
          <div className="pl-3 border-l-2 border-l-slate-300">
            <h3 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">Adjacent Parcels</h3>
            {adjacentParcelsLoading
              ? <p className="text-xs text-text-tertiary flex items-center gap-1.5"><Spinner />Fetching nearby parcels...</p>
              : <p className="text-xs text-text-tertiary">No parcel data returned — Regrid may not have coverage for this county yet.</p>
            }
          </div>
        )}

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

function D({ label, value, accent, full, tooltip }) {
  if (value == null) return null;
  return (
    <div className={`bg-surface-1 rounded-xl px-3 py-2.5 ${full ? 'col-span-2' : ''}`}>
      <p className="text-[10px] text-text-tertiary uppercase tracking-wider leading-none mb-1 flex items-center gap-1">
        {label}
        {tooltip && <InfoTip text={tooltip} />}
      </p>
      <p className={`text-[13px] font-mono leading-tight break-words ${accent ? 'text-accent font-semibold' : 'text-text-primary'}`}>{String(value)}</p>
    </div>
  );
}

// ── Adjacent Parcels Panel ──────────────────────────────────────────────────
function ownerSimilarLocal(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const strip = s => s.replace(/\b(llc|inc|corp|lp|ltd|trust|co)\b\.?/gi, '').replace(/\s+/g, ' ').trim();
  const sa = strip(a), sb = strip(b);
  if (sa === sb || sa.includes(sb) || sb.includes(sa)) return true;
  const wa = sa.split(/\s+/).filter(w => w.length > 2);
  const wb = sb.split(/\s+/).filter(w => w.length > 2);
  if (!wa.length || !wb.length) return false;
  return wa.filter(w => wb.includes(w)).length / Math.min(wa.length, wb.length) >= 0.7;
}

function isParcelRelated(parcelData, adj) {
  if (!parcelData || !adj) return false;
  const tOwners = [parcelData.ownership?.owner, parcelData.ownership?.owner2].filter(Boolean).map(o => o.toLowerCase().trim());
  const aOwners = [adj.owner, adj.owner2].filter(Boolean).map(o => o.toLowerCase().trim());
  if (tOwners.some(to => aOwners.some(ao => ownerSimilarLocal(to, ao)))) return true;
  const tMail = `${parcelData.ownership?.mailadd || ''} ${parcelData.ownership?.mail_zip || ''}`.toLowerCase().trim();
  const aMail = `${adj.mailadd || ''} ${adj.mail_zip || ''}`.toLowerCase().trim();
  return tMail.length > 5 && aMail.length > 5 && tMail === aMail;
}

function AdjacentParcelsPanel({ adjacentParcels, parcelData }) {
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState('all');

  const parcelsWithMatch = adjacentParcels.map(p => ({ ...p, isRelated: isParcelRelated(parcelData, p) }));
  const sameOwnerCount = parcelsWithMatch.filter(p => p.isRelated).length;
  const filtered = filter === 'same' ? parcelsWithMatch.filter(p => p.isRelated)
    : filter === 'other' ? parcelsWithMatch.filter(p => !p.isRelated)
    : parcelsWithMatch;

  return (
    <div className="pl-3 border-l-2 border-l-indigo-400 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
            Adjacent Parcels
            <InfoTip text="Nearby parcels fetched from the county records database. Same-owner parcels are highlighted — they indicate the asset may span multiple parcel IDs. Requires Regrid coverage for this county." />
          </h3>
          <p className="text-[10px] text-text-tertiary mt-0.5">
            {adjacentParcels.length} found · {sameOwnerCount > 0 ? <span className="text-violet-600 font-semibold">{sameOwnerCount} same owner</span> : 'no same-owner parcels'}
          </p>
        </div>
        <button onClick={() => setExpanded(!expanded)}
          className="text-[10px] font-semibold text-accent hover:text-accent-dark transition-colors">
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {/* Same-owner summary strip */}
      {sameOwnerCount > 0 && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl px-3 py-2">
          <p className="text-[11px] font-semibold text-violet-700">
            {sameOwnerCount} parcel{sameOwnerCount > 1 ? 's' : ''} share ownership with this target
          </p>
          <p className="text-[10px] text-violet-500 mt-0.5">
            Combined acreage may be larger than the single-parcel footprint shown above.
          </p>
        </div>
      )}

      {expanded && (
        <>
          <div className="flex gap-1">
            {['all', 'same', 'other'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${filter === f ? 'bg-accent text-white' : 'bg-surface-1 border border-border text-text-tertiary hover:text-text-primary'}`}>
                {f === 'all' ? `All (${adjacentParcels.length})` : f === 'same' ? `Same Owner (${sameOwnerCount})` : `Different (${adjacentParcels.length - sameOwnerCount})`}
              </button>
            ))}
          </div>
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {filtered.map((p, i) => (
              <AdjParcelCard key={p.ll_uuid || p.parcelnumb || i} parcel={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AdjParcelCard({ parcel: p }) {
  return (
    <div className={`rounded-xl border p-3 space-y-1.5 ${p.isRelated ? 'bg-violet-50 border-violet-200' : 'bg-surface-1 border-border'}`}>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${p.isRelated ? 'bg-violet-500' : 'bg-sky-400'}`} />
        <span className={`text-[10px] font-bold uppercase tracking-wider ${p.isRelated ? 'text-violet-700' : 'text-sky-700'}`}>
          {p.isRelated ? 'Same Owner as Target' : 'Different Owner'}
        </span>
      </div>
      <p className={`text-xs font-semibold ${p.isRelated ? 'text-violet-700' : 'text-text-primary'}`}>{p.owner || 'Unknown Owner'}</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-text-tertiary">
        {p.parcelnumb && <span><span className="font-medium text-text-secondary">APN</span> {p.parcelnumb}</span>}
        {p.address && <span className="col-span-2"><span className="font-medium text-text-secondary">Address</span> {p.address}</span>}
        {p.ll_gisacre && <span><span className="font-medium text-text-secondary">Acres</span> {parseFloat(p.ll_gisacre).toFixed(2)} ac</span>}
        {p.parval && <span><span className="font-medium text-text-secondary">Assessed</span> {formatCurrency(p.parval)}</span>}
        {p.zoning && <span><span className="font-medium text-text-secondary">Zone</span> {p.zoning}</span>}
        {p.usedesc && <span><span className="font-medium text-text-secondary">Use</span> {p.usedesc}</span>}
        {p.yearbuilt && <span><span className="font-medium text-text-secondary">Built</span> {p.yearbuilt}</span>}
        {p.saleprice && <span className="col-span-2"><span className="font-medium text-text-secondary">Last Sale</span> {formatCurrency(p.saleprice)}{p.saledate ? ` (${p.saledate})` : ''}</span>}
      </div>
      {p.isRelated && (
        <p className="text-[10px] text-violet-600 font-medium">This parcel shares ownership with the target — the asset may span multiple parcel IDs.</p>
      )}
    </div>
  );
}

function Badge({ color, children }) {
  const c = { green: 'bg-emerald-50 text-emerald-600 border-emerald-200', red: 'bg-red-50 text-red-600 border-red-200', amber: 'bg-amber-50 text-amber-600 border-amber-200', blue: 'bg-blue-50 text-blue-600 border-blue-200' };
  return <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${c[color] || c.blue}`}>{children}</span>;
}

function Alert({ children }) { return <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2"><p className="text-[11px] text-amber-700 font-medium">{children}</p></div>; }
function Empty({ children }) { return <div className="bg-surface-1 border border-border rounded-2xl p-4 text-sm text-text-tertiary">{children}</div>; }
