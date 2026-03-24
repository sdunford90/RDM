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

  // Initialize mini map (preserving upstream WebGL-safe init)
  useEffect(() => {
    if (!mapboxToken || !mapContainer.current) return;
    if (mapRef.current) return;

    if (!mapboxgl.supported()) {
      console.warn('Mapbox GL is not supported in this environment (WebGL unavailable).');
      return;
    }

    let map;
    let geocoder;
    try {
      mapboxgl.accessToken = mapboxToken;
      map = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: [-96.7, 32.9],
        zoom: 4
      });

      map.addControl(new mapboxgl.NavigationControl(), 'top-right');

      geocoder = new MapboxGeocoder({
        accessToken: mapboxToken,
        mapboxgl: mapboxgl,
        placeholder: 'Search address...',
        countries: 'us',
        types: 'address,poi,place'
      });

      if (geocoderContainer.current) {
        geocoderContainer.current.innerHTML = '';
        geocoderContainer.current.appendChild(geocoder.onAdd(map));
      }

      geocoder.on('result', (e) => {
        const { center, place_name } = e.result;
        setAddress(place_name);
        onAnalyze(place_name, { lat: center[1], lng: center[0] });
      });

      mapRef.current = map;
      geocoderRef.current = geocoder;
    } catch (err) {
      console.warn('Failed to initialize map:', err);
      if (map) { try { map.remove(); } catch (_) {} }
      return;
    }

    return () => {
      try { geocoderRef.current?.onRemove(); } catch (_) {}
      geocoderRef.current = null;
      if (geocoderContainer.current) geocoderContainer.current.innerHTML = '';
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch (_) {}
        mapRef.current = null;
      }
    };
  }, [mapboxToken]);

  useEffect(() => {
    if (!mapRef.current || !mapCenter) return;
    mapRef.current.flyTo({ center: [mapCenter.lng, mapCenter.lat], zoom: 16, pitch: 45, duration: 2000 });
    new mapboxgl.Marker({ color: '#C9A84C' }).setLngLat([mapCenter.lng, mapCenter.lat]).addTo(mapRef.current);
  }, [mapCenter]);

  useEffect(() => {
    if (!mapRef.current || !parcelGeometry) return;
    const map = mapRef.current;
    const addLayer = () => {
      if (map.getSource('parcel')) {
        map.removeLayer('parcel-fill');
        map.removeLayer('parcel-outline');
        map.removeSource('parcel');
      }
      map.addSource('parcel', { type: 'geojson', data: { type: 'Feature', geometry: parcelGeometry } });
      map.addLayer({ id: 'parcel-fill', type: 'fill', source: 'parcel', paint: { 'fill-color': '#C9A84C', 'fill-opacity': 0.2 } });
      map.addLayer({ id: 'parcel-outline', type: 'line', source: 'parcel', paint: { 'line-color': '#C9A84C', 'line-width': 2 } });
    };
    if (map.isStyleLoaded()) addLayer();
    else map.on('load', addLayer);
  }, [parcelGeometry]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!address.trim() || !mapboxToken) return;
    fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxToken}&country=us`)
      .then(r => r.json())
      .then(data => {
        if (data.features?.length > 0) {
          const [lng, lat] = data.features[0].center;
          onAnalyze(address, { lat, lng });
        }
      });
  };

  const p = parcelData;
  const m = marketData;

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

        {/* === PARCEL DATA (Full Regrid fields) === */}
        {p && !p.error && (
          <>
            {/* Property Header */}
            <div className="bg-navy-800 border border-navy-700 rounded-lg p-4">
              <h2 className="text-base font-semibold text-slate-text">
                {p.identity?.location_name || p.identity?.address || 'Property'}
              </h2>
              <p className="text-xs text-slate-secondary mt-1">
                {[p.identity?.address, p.identity?.scity, p.identity?.state2, p.identity?.szip].filter(Boolean).join(', ')}
              </p>
              {p.identity?.county && <p className="text-xs text-slate-secondary">{p.identity.county} County</p>}
              <div className="flex flex-wrap gap-2 mt-2">
                {p.federal?.qoz === 'Yes' && <Badge color="green">Opportunity Zone</Badge>}
                {p.federal?.fema_flood_zone && ['AE', 'VE', 'A', 'V'].includes(p.federal.fema_flood_zone) && (
                  <Badge color="red">Flood Zone {p.federal.fema_flood_zone}</Badge>
                )}
                {p.nonArmsLength && <Badge color="amber">Non-Arms-Length Transfer</Badge>}
                {p.ownership?.owntype && p.ownership.owntype !== 'Individual' && (
                  <Badge color="blue">{p.ownership.owntype}</Badge>
                )}
              </div>
            </div>

            {/* Identity & Location */}
            <DataSection title="Identity & Location">
              <DataCard label="Parcel ID (APN)" value={p.identity?.parcelnumb} />
              <DataCard label="State Parcel ID" value={p.identity?.state_parcelnumb} />
              <DataCard label="Tax Account #" value={p.identity?.account_number} />
              <DataCard label="FIPS Code" value={p.identity?.geoid} />
              <DataCard label="Coordinates" value={p.identity?.lat && p.identity?.lon ? `${p.identity.lat}, ${p.identity.lon}` : null} />
              <DataCard label="Data Refresh" value={p.identity?.ll_last_refresh} />
              {p.identity?.sourceurl && (
                <div className="col-span-2">
                  <a href={p.identity.sourceurl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-gold hover:text-gold-light underline">View County Record</a>
                </div>
              )}
            </DataSection>

            {/* Ownership */}
            <DataSection title="Ownership">
              <DataCard label="Owner of Record" value={p.ownership?.owner} highlight />
              {p.ownership?.unmodified_owner && p.ownership.unmodified_owner !== p.ownership.owner && (
                <DataCard label="Owner (raw)" value={p.ownership.unmodified_owner} />
              )}
              <DataCard label="Owner Type" value={p.ownership?.owntype} />
              {(p.ownership?.ownfrst || p.ownership?.ownlast) && (
                <DataCard label="Owner Name" value={`${p.ownership.ownfrst || ''} ${p.ownership.ownlast || ''}`.trim()} />
              )}
              {p.ownership?.owner2 && <DataCard label="Co-Owner 2" value={p.ownership.owner2} />}
              {p.ownership?.owner3 && <DataCard label="Co-Owner 3" value={p.ownership.owner3} />}
              {p.ownership?.owner4 && <DataCard label="Co-Owner 4" value={p.ownership.owner4} />}
              <DataCard label="Previous Owner" value={p.sale?.previous_owner} />
              <DataCard label="Mailing Address" value={
                [p.ownership?.mailadd, p.ownership?.mail_city, p.ownership?.mail_state2, p.ownership?.mail_zip].filter(Boolean).join(', ') || null
              } full />
              {p.ownership?.mail_country && p.ownership.mail_country !== 'US' && (
                <DataCard label="Country" value={p.ownership.mail_country} highlight />
              )}
            </DataSection>

            {/* Enhanced Ownership (if available) */}
            {p.enhanced_ownership?.eo_owner && (
              <DataSection title="Enhanced Ownership (Deed Records)">
                <DataCard label="Deed Owner" value={p.enhanced_ownership.eo_owner} highlight />
                {p.enhanced_ownership.eo_owner2 && <DataCard label="Deed Owner 2" value={p.enhanced_ownership.eo_owner2} />}
                {p.enhanced_ownership.eo_owner3 && <DataCard label="Deed Owner 3" value={p.enhanced_ownership.eo_owner3} />}
                <DataCard label="Primary Grantee" value={p.enhanced_ownership.eo_deedowner} />
                {p.enhanced_ownership.eo_deedowner2 && <DataCard label="Grantee 2" value={p.enhanced_ownership.eo_deedowner2} />}
                <DataCard label="Enhanced Mailing" value={
                  [p.enhanced_ownership.eo_mail_address, p.enhanced_ownership.eo_mail_city, p.enhanced_ownership.eo_mail_state, p.enhanced_ownership.eo_mail_zip].filter(Boolean).join(', ') || null
                } full />
                {p.enhanced_ownership.eo_owner && p.ownership?.owner && p.enhanced_ownership.eo_owner !== p.ownership.owner && (
                  <div className="col-span-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                    <p className="text-xs text-amber-400">Deed owner differs from assessor owner — verify who you are negotiating with</p>
                  </div>
                )}
              </DataSection>
            )}

            {/* Sale & Transfer */}
            <DataSection title="Sale & Transfer History">
              <DataCard label="Last Sale Price" value={p.sale?.saleprice ? formatCurrency(p.sale.saleprice) : null} highlight />
              <DataCard label="Last Sale Date" value={p.sale?.saledate} />
              <DataCard label="Last Transfer Date" value={p.sale?.last_ownership_transfer_date} />
              <DataCard label="Previous Owner" value={p.sale?.previous_owner} />
              {p.nonArmsLength && (
                <div className="col-span-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  <p className="text-xs text-amber-400">Sale date and transfer date differ — last transfer was likely non-arms-length. Sale price may not reflect market value.</p>
                </div>
              )}
            </DataSection>

            {/* Tax & Valuation */}
            <DataSection title="Tax & Valuation">
              <DataCard label="Total Assessed Value" value={p.tax?.parval ? formatCurrency(p.tax.parval) : null} highlight />
              <DataCard label="Land Value" value={p.tax?.landval ? formatCurrency(p.tax.landval) : null} />
              <DataCard label="Improvement Value" value={p.tax?.improvval ? formatCurrency(p.tax.improvval) : null} />
              {p.tax?.agval && <DataCard label="Ag Value" value={formatCurrency(p.tax.agval)} />}
              {p.tax?.agval && (
                <div className="col-span-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  <p className="text-xs text-amber-400">Agricultural exemption claimed — verify if commercial land is receiving ag tax treatment</p>
                </div>
              )}
              <DataCard label="Value Type" value={p.tax?.parvaltype} />
              <DataCard label="Annual Tax Bill" value={p.tax?.taxamt ? formatCurrency(p.tax.taxamt) : null} highlight />
              <DataCard label="Tax Year" value={p.tax?.taxyear} />
            </DataSection>

            {/* Physical & Structure */}
            <DataSection title="Physical & Structure">
              <DataCard label="Acreage (GIS)" value={p.physical?.ll_gisacre ? `${p.physical.ll_gisacre} ac` : null} highlight />
              {p.physical?.gisacre && p.physical.gisacre !== p.physical.ll_gisacre && (
                <DataCard label="Acreage (County)" value={`${p.physical.gisacre} ac`} />
              )}
              {p.physical?.deeded_acres && <DataCard label="Deeded Acres" value={`${p.physical.deeded_acres} ac`} />}
              <DataCard label="Parcel Sq Ft" value={p.physical?.ll_gissqft ? formatNumber(p.physical.ll_gissqft) : null} />
              <DataCard label="Building Area" value={p.physical?.area_building ? `${formatNumber(p.physical.area_building)} sq ft` : null} />
              <DataCard label="Area Type" value={p.physical?.area_building_definition} />
              <DataCard label="Structures" value={p.physical?.structno} />
              <DataCard label="Year Built" value={p.physical?.yearbuilt} />
              <DataCard label="Effective Year Built" value={p.physical?.year_built_effective_date} />
              <DataCard label="Stories" value={p.physical?.numstories} />
              <DataCard label="Living Units" value={p.physical?.numunits} />
              <DataCard label="Bedrooms" value={p.physical?.num_bedrooms} />
              <DataCard label="Bathrooms" value={p.physical?.num_bath} />
              <DataCard label="Structure Style" value={p.physical?.structstyle} />
            </DataSection>

            {/* Land Use & Zoning */}
            <DataSection title="Land Use & Zoning">
              <DataCard label="Use Code" value={p.landuse?.usecode} />
              <DataCard label="Use Description" value={p.landuse?.usedesc} highlight />
              <DataCard label="Zoning Code" value={p.landuse?.zoning} />
              <DataCard label="Zoning Description" value={p.landuse?.zoning_description} />
              <DataCard label="LBCS Activity" value={p.landuse?.lbcs_activity} />
              <DataCard label="Legal Description" value={p.landuse?.legaldesc} full />
              {(p.landuse?.lot || p.landuse?.block || p.landuse?.subdivision) && (
                <DataCard label="Lot/Block/Sub" value={
                  [p.landuse?.lot && `Lot ${p.landuse.lot}`, p.landuse?.block && `Block ${p.landuse.block}`, p.landuse?.subdivision].filter(Boolean).join(', ')
                } full />
              )}
            </DataSection>

            {/* Federal Designations */}
            <DataSection title="Federal Designations">
              <DataCard label="Opportunity Zone" value={p.federal?.qoz} badge={p.federal?.qoz === 'Yes' ? 'green' : null} />
              {p.federal?.qoz_tract && <DataCard label="OZ Tract" value={p.federal.qoz_tract} />}
              <DataCard label="FEMA Flood Zone" value={p.federal?.fema_flood_zone}
                badge={p.federal?.fema_flood_zone && ['AE', 'VE', 'A', 'V'].includes(p.federal.fema_flood_zone) ? 'red' : null} />
              {p.federal?.fema_flood_zone_subtype && <DataCard label="Flood Subtype" value={p.federal.fema_flood_zone_subtype} />}
              {p.federal?.fema_nri_risk_rating && <DataCard label="Natural Hazard Risk" value={p.federal.fema_nri_risk_rating} />}
              <DataCard label="Census Tract" value={p.federal?.census_tract} />
              <DataCard label="Block Group" value={p.federal?.census_blockgroup} />
            </DataSection>

            {/* Premium Fields (if any populated) */}
            {hasAnyValue(p.premium) && (
              <DataSection title="Premium Data">
                {p.premium?.zoning_type && <DataCard label="Standardized Zoning" value={p.premium.zoning_type} />}
                {p.premium?.zoning_code_link && (
                  <div className="col-span-2">
                    <a href={p.premium.zoning_code_link} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-gold hover:text-gold-light underline">View Municipal Zoning Code</a>
                  </div>
                )}
                {p.premium?.ll_bldg_footprint_sqft && <DataCard label="Bldg Footprint" value={`${formatNumber(p.premium.ll_bldg_footprint_sqft)} sq ft`} />}
                {p.premium?.ll_bldg_count && <DataCard label="Building Count" value={p.premium.ll_bldg_count} />}
                {p.premium?.ll_address_count && <DataCard label="Address Count" value={p.premium.ll_address_count} />}
                {p.premium?.homestead_exemption && <DataCard label="Homestead Exemption" value={p.premium.homestead_exemption} />}
                {p.premium?.elevation_highest && <DataCard label="Highest Elevation" value={`${p.premium.elevation_highest}m ASL`} />}
                {p.premium?.elevation_lowest && <DataCard label="Lowest Elevation" value={`${p.premium.elevation_lowest}m ASL`} />}
                {p.premium?.elevation_roughness && <DataCard label="Terrain Roughness" value={p.premium.elevation_roughness} />}
              </DataSection>
            )}
          </>
        )}

        {p?.error && (
          <div className="bg-navy-800 border border-navy-700 rounded-lg p-4 text-sm text-slate-secondary">
            {p.error}. You can enter data manually in the Underwriting tab.
          </div>
        )}

        {/* === STR MARKET DATA (AirROI) === */}
        {m && !m.error && (
          <>
            <DataSection title="STR Market Data">
              {m.market_name && <DataCard label="Market" value={m.market_name} full highlight />}
              <DataCard label="Market ADR" value={m.summary?.avg_daily_rate || m.avg_daily_rate ? `$${m.summary?.avg_daily_rate || m.avg_daily_rate}/night` : null} highlight />
              <DataCard label="Market Occupancy" value={m.summary?.avg_occupancy || m.avg_occupancy ? formatPercent(m.summary?.avg_occupancy || m.avg_occupancy) : null} highlight />
              <DataCard label="Avg Monthly Revenue" value={m.summary?.avg_monthly_revenue || m.avg_monthly_revenue ? formatCurrency(m.summary?.avg_monthly_revenue || m.avg_monthly_revenue) : null} />
              <DataCard label="Active STR Listings" value={m.summary?.active_listings || m.active_listings ? formatNumber(m.summary?.active_listings || m.active_listings) : null} />
              <DataCard label="Avg Guest Rating" value={m.summary?.avg_rating ? `${m.summary.avg_rating}/5` : null} />

              {m.metrics?.revpar && (
                <DataCard label="Market RevPAR" value={m.metrics.revpar.value ? `$${m.metrics.revpar.value}` : null} />
              )}
              {m.metrics?.supply?.yoy_growth != null && (
                <DataCard label="Supply Growth YoY" value={formatPercent(m.metrics.supply.yoy_growth)}
                  badge={m.metrics.supply.yoy_growth > 20 ? 'red' : null} />
              )}
              {m.metrics?.booking_lead_time?.avg && (
                <DataCard label="Avg Booking Lead Time" value={`${m.metrics.booking_lead_time.avg} days`} />
              )}
              {m.metrics?.length_of_stay?.avg && (
                <DataCard label="Avg Length of Stay" value={`${m.metrics.length_of_stay.avg} nights`} />
              )}
              <DataCard label="Data Radius" value={`${m.radius_miles || 10} miles`} />
            </DataSection>

            {/* Property Revenue Estimate */}
            {m.estimate && (
              <DataSection title="Property Revenue Estimate (AirROI)">
                <DataCard label="Projected Annual Revenue" value={m.estimate.projected_annual_revenue ? formatCurrency(m.estimate.projected_annual_revenue) : null} highlight />
                <DataCard label="Projected ADR" value={m.estimate.projected_adr ? `$${m.estimate.projected_adr}/night` : null} highlight />
                <DataCard label="Projected Occupancy" value={m.estimate.projected_occupancy ? formatPercent(m.estimate.projected_occupancy) : null} highlight />
                <DataCard label="Comps Used" value={m.estimate.comp_count ? formatNumber(m.estimate.comp_count) : null} />
                <div className="col-span-2 text-[10px] text-slate-secondary">
                  AirROI market estimate — adjust as needed in Underwriting tab
                </div>
              </DataSection>
            )}

            {/* Active Listing Data */}
            {m.listing && (
              <DataSection title="Active STR Listing Found">
                <DataCard label="Listing ID" value={m.listing.listing_id} />
                {m.listing.listing_data?.avg_review_score && (
                  <DataCard label="Guest Rating" value={`${m.listing.listing_data.avg_review_score}/5`} />
                )}
                {m.listing.listing_data?.review_count && (
                  <DataCard label="Reviews" value={formatNumber(m.listing.listing_data.review_count)} />
                )}
                {m.listing.listing_data?.min_stay_requirements && (
                  <DataCard label="Min Stay" value={`${m.listing.listing_data.min_stay_requirements} nights`} />
                )}
                <div className="col-span-2 text-[10px] text-slate-secondary">
                  Property is actively listed — historical performance data available
                </div>
              </DataSection>
            )}

            {/* Charts */}
            <MarketCharts metrics={m.metrics} estimate={m.estimate} />
          </>
        )}

        {m?.error && (
          <div className="bg-navy-800 border border-navy-700 rounded-lg p-4 text-sm text-slate-secondary">
            {m.error}. You can enter STR data manually in the Underwriting tab.
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

function hasAnyValue(obj) {
  if (!obj) return false;
  return Object.values(obj).some(v => v != null);
}

function DataSection({ title, children }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gold uppercase tracking-wider">{title}</h3>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </div>
  );
}

function DataCard({ label, value, highlight, full, badge }) {
  if (value == null) return null;
  return (
    <div className={`bg-navy-800 border border-navy-700 rounded-lg p-3 ${full ? 'col-span-2' : ''}`}>
      <p className="text-[10px] text-slate-secondary uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <p className={`text-sm font-mono ${highlight ? 'text-gold font-semibold' : 'text-slate-text'} break-words`}>
          {String(value)}
        </p>
        {badge && <BadgeInline color={badge} />}
      </div>
    </div>
  );
}

function Badge({ color, children }) {
  const colors = {
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border ${colors[color] || colors.blue}`}>
      {children}
    </span>
  );
}

function BadgeInline({ color }) {
  const colors = { green: 'bg-green-400', red: 'bg-red-400', amber: 'bg-amber-400' };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[color] || ''}`} />;
}
