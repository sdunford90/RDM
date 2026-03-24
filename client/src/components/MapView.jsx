import React, { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import { formatCurrency, formatNumber } from '../utils/formatters';

// Ownership match logic — fuzzy name matching handles minor spelling variants
function ownerSimilar(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  // One is a substring of the other (covers "SOUTHERN MARINA" vs "SOUTHERN MARINAS")
  if (a.includes(b) || b.includes(a)) return true;
  // Strip common suffixes and compare (LLC, INC, CORP, LP, LTD, TRUST)
  const strip = s => s.replace(/\b(llc|inc|corp|lp|ltd|trust|co)\b\.?/gi, '').replace(/\s+/g, ' ').trim();
  const sa = strip(a), sb = strip(b);
  if (sa === sb) return true;
  if (sa.includes(sb) || sb.includes(sa)) return true;
  // If shared meaningful words cover >70% of the shorter string
  const wordsA = sa.split(/\s+/).filter(w => w.length > 2);
  const wordsB = sb.split(/\s+/).filter(w => w.length > 2);
  if (!wordsA.length || !wordsB.length) return false;
  const shared = wordsA.filter(w => wordsB.includes(w)).length;
  const shorter = Math.min(wordsA.length, wordsB.length);
  return shared / shorter >= 0.7;
}

function checkOwnerMatch(target, adjacent) {
  if (!target || !adjacent) return { nameMatch: false, mailMatch: false, isRelated: false };

  const targetOwners = [target.ownership?.owner, target.ownership?.owner2, target.ownership?.owner3, target.ownership?.owner4]
    .filter(Boolean).map(o => o.toLowerCase().trim());
  const adjOwners = [adjacent.owner, adjacent.owner2, adjacent.owner3, adjacent.owner4]
    .filter(Boolean).map(o => o.toLowerCase().trim());

  const nameMatch = targetOwners.some(to => adjOwners.some(ao => ownerSimilar(to, ao)));

  const targetMail = `${target.ownership?.mailadd || ''} ${target.ownership?.mail_zip || ''}`.toLowerCase().trim();
  const adjMail = `${adjacent.mailadd || ''} ${adjacent.mail_zip || ''}`.toLowerCase().trim();
  const mailMatch = targetMail.length > 5 && adjMail.length > 5 && targetMail === adjMail;

  return { nameMatch, mailMatch, isRelated: nameMatch || mailMatch };
}

export default function MapView({ mapboxToken, center, parcelGeometry, parcelData, adjacentParcels = [] }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const [mapStyle, setMapStyle] = useState('satellite');
  const [showParcel, setShowParcel] = useState(true);
  const [showAdjacent, setShowAdjacent] = useState(true);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);

  // Compute ownership stats
  const ownerStats = adjacentParcels.length > 0 ? (() => {
    let sameOwner = 0, totalAcres = 0;
    const targetAcres = parseFloat(parcelData?.physical?.ll_gisacre) || 0;
    adjacentParcels.forEach(p => {
      const match = checkOwnerMatch(parcelData, p);
      if (match.isRelated) { sameOwner++; totalAcres += parseFloat(p.ll_gisacre) || 0; }
    });
    return { sameOwner, otherParcels: adjacentParcels.length - sameOwner, totalAcres: totalAcres + targetAcres };
  })() : null;

  useEffect(() => {
    if (!mapboxToken || !mapContainer.current) return;
    if (!mapboxgl.supported()) return;
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

    mapboxgl.accessToken = mapboxToken;
    const style = mapStyle === 'satellite' ? 'mapbox://styles/mapbox/satellite-streets-v12' : 'mapbox://styles/mapbox/light-v11';
    let map;
    try {
      map = new mapboxgl.Map({
        container: mapContainer.current, style,
        center: center ? [center.lng, center.lat] : [-96.7, 32.9],
        zoom: center ? 16 : 4, pitch: center ? 45 : 0
      });
      map.addControl(new mapboxgl.NavigationControl(), 'top-right');
      map.addControl(new mapboxgl.FullscreenControl(), 'top-right');
      map.addControl(new MapboxGeocoder({ accessToken: mapboxToken, mapboxgl, placeholder: 'Search...', countries: 'us' }), 'top-left');

      map.on('load', () => {
        // ── Adjacent parcels layer ──
        if (adjacentParcels.length > 0 && showAdjacent) {
          const features = adjacentParcels
            .filter(p => p.geometry)
            .map(p => {
              const match = checkOwnerMatch(parcelData, p);
              return {
                type: 'Feature',
                geometry: p.geometry,
                properties: {
                  ...p,
                  isRelated: match.isRelated,
                  matchType: match.nameMatch ? 'name' : match.mailMatch ? 'mail' : 'none'
                }
              };
            });

          map.addSource('adjacent-parcels', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features }
          });

          // Fill — same owner = violet, different = blue
          map.addLayer({
            id: 'adjacent-fill', type: 'fill', source: 'adjacent-parcels',
            paint: {
              'fill-color': ['case', ['get', 'isRelated'], '#7c3aed', '#0ea5e9'],
              'fill-opacity': ['case', ['get', 'isRelated'], 0.2, 0.08]
            }
          });

          // Outline
          map.addLayer({
            id: 'adjacent-outline', type: 'line', source: 'adjacent-parcels',
            paint: {
              'line-color': ['case', ['get', 'isRelated'], '#a855f7', '#38bdf8'],
              'line-width': ['case', ['get', 'isRelated'], 2, 1],
              'line-opacity': 0.7
            }
          });

          // Click interaction
          map.on('click', 'adjacent-fill', (e) => {
            if (!e.features?.length) return;
            const props = e.features[0].properties;
            // Properties from GeoJSON are serialized — parse booleans
            const parcel = { ...props, isRelated: props.isRelated === true || props.isRelated === 'true' };
            setSelectedParcel(parcel);
            setPanelOpen(true);
          });

          map.on('mouseenter', 'adjacent-fill', () => map.getCanvas().style.cursor = 'pointer');
          map.on('mouseleave', 'adjacent-fill', () => map.getCanvas().style.cursor = '');
        }

        // ── Target parcel layer (on top) ──
        if (parcelGeometry && showParcel) {
          map.addSource('parcel', { type: 'geojson', data: { type: 'Feature', geometry: parcelGeometry } });
          map.addLayer({ id: 'parcel-fill', type: 'fill', source: 'parcel', paint: { 'fill-color': '#7c3aed', 'fill-opacity': 0.25 } });
          map.addLayer({ id: 'parcel-outline', type: 'line', source: 'parcel', paint: { 'line-color': '#7c3aed', 'line-width': 3 } });

          map.on('click', 'parcel-fill', () => {
            setSelectedParcel(null);
            setPanelOpen(true);
          });
          map.on('mouseenter', 'parcel-fill', () => map.getCanvas().style.cursor = 'pointer');
          map.on('mouseleave', 'parcel-fill', () => map.getCanvas().style.cursor = '');
        }

        if (center) new mapboxgl.Marker({ color: '#7c3aed' }).setLngLat([center.lng, center.lat]).addTo(map);
      });

      mapRef.current = map;
    } catch (err) { if (map) try { map.remove(); } catch (_) {} }
    return () => { if (mapRef.current) { try { mapRef.current.remove(); } catch (_) {} mapRef.current = null; } };
  }, [mapboxToken, mapStyle, center, parcelGeometry, showParcel, showAdjacent, adjacentParcels]);

  return (
    <div className="h-[calc(100vh-108px)] relative flex">
      {/* Map */}
      <div className={`${panelOpen ? 'flex-1' : 'w-full'} h-full relative transition-all`}>
        <div ref={mapContainer} className="w-full h-full" />

        {/* Ownership summary strip */}
        {ownerStats && showAdjacent && adjacentParcels.length > 0 && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-white/95 backdrop-blur-md rounded-xl px-4 py-2 shadow-card border border-border flex items-center gap-4 text-[11px]">
            <span className="font-semibold text-text-primary">Target: {parcelData?.physical?.ll_gisacre || '?'} ac</span>
            <span className="text-border">|</span>
            {ownerStats.sameOwner > 0 && (
              <>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                  <span className="text-violet-700 font-semibold">{ownerStats.sameOwner} same-owner</span>
                </span>
                <span className="text-border">|</span>
              </>
            )}
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              <span className="text-sky-700">{ownerStats.otherParcels} adjacent</span>
            </span>
            {ownerStats.sameOwner > 0 && (
              <>
                <span className="text-border">|</span>
                <span className="text-amber-600 font-semibold">Combined: {ownerStats.totalAcres.toFixed(1)} ac</span>
              </>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-5 left-5 flex gap-2 z-10 flex-wrap">
          <Pill onClick={() => setMapStyle(mapStyle === 'satellite' ? 'light' : 'satellite')}>
            {mapStyle === 'satellite' ? 'Street' : 'Satellite'}
          </Pill>
          <Pill active={showParcel} onClick={() => setShowParcel(!showParcel)}>Parcel</Pill>
          {adjacentParcels.length > 0 && (
            <Pill active={showAdjacent} onClick={() => setShowAdjacent(!showAdjacent)}>
              Adjacent ({adjacentParcels.length})
            </Pill>
          )}
          {center && (
            <Pill accent onClick={() => mapRef.current?.flyTo({ center: [center.lng, center.lat], zoom: 17, pitch: 60, duration: 2000 })}>
              Fly to Property
            </Pill>
          )}
        </div>

        {!mapboxToken && <Overlay>Configure MAPBOX_TOKEN</Overlay>}
        {mapboxToken && !mapboxgl.supported() && <Overlay>WebGL required</Overlay>}
      </div>

      {/* Side panel */}
      {panelOpen && (
        <div className="w-[340px] h-full bg-white border-l border-border overflow-y-auto flex-shrink-0">
          <div className="sticky top-0 bg-white border-b border-border px-4 py-3 flex items-center justify-between z-10">
            <div className="text-[11px] text-text-tertiary">
              {selectedParcel ? (
                <span>
                  <button onClick={() => { setSelectedParcel(null); }} className="text-accent hover:underline">Target</button>
                  <span className="mx-1">/</span>
                  <span className="text-text-primary font-medium">APN: {selectedParcel.parcelnumb || 'N/A'}</span>
                </span>
              ) : (
                <span className="text-text-primary font-semibold">Target Parcel</span>
              )}
            </div>
            <button onClick={() => { setPanelOpen(false); setSelectedParcel(null); }}
              className="w-6 h-6 flex items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-all text-sm">x</button>
          </div>

          <div className="p-4 space-y-3">
            {selectedParcel ? (
              <AdjacentParcelDetail parcel={selectedParcel} targetOwner={parcelData?.ownership?.owner} />
            ) : (
              <TargetParcelDetail parcelData={parcelData} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TargetParcelDetail({ parcelData }) {
  if (!parcelData) return <p className="text-xs text-text-tertiary">No parcel data loaded</p>;
  const p = parcelData;
  return (
    <div className="space-y-3">
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-3">
        <p className="text-xs font-bold text-violet-700">{p.ownership?.owner || 'Unknown Owner'}</p>
        <p className="text-[10px] text-text-tertiary mt-0.5">{p.identity?.address}</p>
      </div>
      <Field label="APN" value={p.identity?.parcelnumb} />
      <Field label="Acreage" value={p.physical?.ll_gisacre ? `${p.physical.ll_gisacre} ac` : null} />
      <Field label="Assessed Value" value={p.tax?.parval ? formatCurrency(p.tax.parval) : null} />
      <Field label="Land Value" value={p.tax?.landval ? formatCurrency(p.tax.landval) : null} />
      <Field label="Tax Bill" value={p.tax?.taxamt ? formatCurrency(p.tax.taxamt) : null} />
      <Field label="Zoning" value={p.landuse?.zoning} />
      <Field label="Use" value={p.landuse?.usedesc} />
      <Field label="Year Built" value={p.physical?.yearbuilt} />
      <Field label="Flood Zone" value={p.federal?.fema_flood_zone} />
      <Field label="Last Sale" value={p.sale?.saleprice ? `${formatCurrency(p.sale.saleprice)} (${p.sale.saledate})` : null} />
    </div>
  );
}

function AdjacentParcelDetail({ parcel, targetOwner }) {
  const p = parcel;
  const isRelated = p.isRelated === true || p.isRelated === 'true';

  return (
    <div className="space-y-3">
      {/* Ownership badge */}
      {isRelated ? (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-violet-500" />
            <span className="text-[10px] font-bold text-violet-700 uppercase tracking-wider">Same Owner as Target</span>
          </div>
          <p className="text-xs font-bold text-violet-700">{p.owner || 'Unknown'}</p>
        </div>
      ) : (
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider">Different Owner</span>
          </div>
          <p className="text-xs font-bold text-sky-700">{p.owner || 'Unknown'}</p>
        </div>
      )}

      <Field label="APN" value={p.parcelnumb} />
      <Field label="Address" value={p.address} />
      <Field label="Acreage" value={p.ll_gisacre ? `${p.ll_gisacre} ac` : null} />
      <Field label="Assessed Value" value={p.parval ? formatCurrency(p.parval) : null} />
      <Field label="Land Value" value={p.landval ? formatCurrency(p.landval) : null} />
      <Field label="Tax Bill" value={p.taxamt ? formatCurrency(p.taxamt) : null} />
      <Field label="Zoning" value={p.zoning} />
      <Field label="Use" value={p.usedesc} />
      <Field label="Year Built" value={p.yearbuilt} />
      <Field label="Flood Zone" value={p.fema_flood_zone} />
      <Field label="Last Sale" value={p.saleprice ? `${formatCurrency(p.saleprice)} (${p.saledate || 'N/A'})` : null} />

      {isRelated && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-[11px] text-amber-700 font-medium">
            This parcel shares ownership with the target — the asset may span multiple parcel IDs.
          </p>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start py-1 border-b border-border/50 last:border-0">
      <span className="text-[10px] text-text-tertiary uppercase tracking-wider shrink-0">{label}</span>
      <span className="text-xs font-mono text-text-primary text-right ml-3">{String(value)}</span>
    </div>
  );
}

function Pill({ children, onClick, active, accent }) {
  return (
    <button onClick={onClick} className={`px-3.5 py-2 rounded-xl text-xs font-semibold shadow-card backdrop-blur-md transition-all ${
      accent ? 'bg-gradient-brand text-white shadow-glow-violet hover:opacity-90' :
      active ? 'bg-white text-accent border border-violet-200' :
      'bg-white/90 text-text-secondary border border-white/50 hover:bg-white'
    }`}>{children}</button>
  );
}

function Overlay({ children }) {
  return <div className="absolute inset-0 flex items-center justify-center bg-surface-2"><p className="text-text-tertiary text-sm">{children}</p></div>;
}
