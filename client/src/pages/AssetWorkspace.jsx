// The original 4-tab underwriting workspace, now mounted at /asset/:id.
// Hydrates from an existing asset id or starts blank for ad-hoc deep dives.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TargetOverview from '../components/TargetOverview';
import UnderwritingModel from '../components/UnderwritingModel';
import MapView from '../components/MapView';
import { fetchMapboxToken, fetchParcelData, fetchMarketData, saveAsset, getAsset } from '../utils/api';

const TABS = [
  { id: 'overview',     label: 'Overview' },
  { id: 'underwriting', label: 'Underwriting' },
  { id: 'map',          label: 'Map' }
];

const defaultUnderwriting = {
  slipCategories: [], strUnits: [], otherRevenue: [],
  expenses: {
    mgmtFeeEnabled: true, mgmtFeePct: 6,
    propertyTaxes: 0, insurance: 0, utilities: 0,
    maintenanceMode: 'percent', maintenancePct: 5, maintenanceFlat: 0,
    payroll: 0, marketing: 0, otherOpex: 0
  },
  purchasePrice: 0,
  targetCapRate: 7
};

export default function AssetWorkspace() {
  const { id } = useParams();
  const nav = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [mapboxToken, setMapboxToken] = useState(null);
  const [currentAsset, setCurrentAsset] = useState(null);
  const [parcelData, setParcelData] = useState(null);
  const [marketData, setMarketData] = useState(null);
  const [underwriting, setUnderwriting] = useState(defaultUnderwriting);
  const [mapCenter, setMapCenter] = useState(null);
  const [parcelGeometry, setParcelGeometry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [notes, setNotes] = useState('');
  const autoSaveTimer = useRef(null);

  useEffect(() => { fetchMapboxToken().then(setMapboxToken).catch(console.error); }, []);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    getAsset(id).then(asset => {
      if (cancelled || !asset) return;
      setCurrentAsset(asset);
      setParcelData(asset.parcel || null);
      setMarketData(asset.market || null);
      setUnderwriting(asset.underwriting || defaultUnderwriting);
      setNotes(asset.notes || '');
      if (asset.parcel?.geometry) setParcelGeometry(asset.parcel.geometry);
      if (asset.lat && asset.lng) setMapCenter({ lat: asset.lat, lng: asset.lng });
    }).catch(console.error).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  // Autosave when an existing asset is loaded.
  useEffect(() => {
    if (!currentAsset?.id) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => handleSave(true), 30000);
    return () => clearTimeout(autoSaveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [underwriting, notes, currentAsset?.id]);

  const handleAnalyze = useCallback(async (address, coords) => {
    setLoading(true);
    setParcelData(null); setMarketData(null); setParcelGeometry(null);
    try {
      const lat = coords?.lat, lng = coords?.lng;
      const [parcel, market] = await Promise.all([
        fetchParcelData({ lat, lng, address }),
        fetchMarketData({ lat, lng, radius_miles: 10 })
      ]);
      setParcelData(parcel); setMarketData(market);
      if (parcel?.geometry) setParcelGeometry(parcel.geometry);
      if (lat && lng) setMapCenter({ lat, lng });
      setCurrentAsset(prev => ({ ...prev, address, lat, lng, label: prev?.label || address?.split(',')[0] || 'New Target' }));
    } catch (e) { console.error('Analysis failed:', e); }
    finally { setLoading(false); }
  }, []);

  async function handleSave(isAutoSave = false) {
    if (!currentAsset?.address && !currentAsset?.id) return;
    try {
      const asset = { ...currentAsset, parcel: parcelData, market: marketData, underwriting, notes };
      const saved = await saveAsset(asset);
      setCurrentAsset(saved);
      setSaveStatus(isAutoSave ? 'auto' : 'manual');
      setTimeout(() => setSaveStatus(null), 3000);
      if (!id) nav(`/asset/${saved.id}`, { replace: true });
    } catch (e) { console.error('Save failed:', e); setSaveStatus('error'); setTimeout(() => setSaveStatus(null), 3000); }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sub-header */}
      <div className="px-3 md:px-5 py-2 bg-surface border-b border-hairline flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
          <button onClick={() => nav('/pipeline')} className="text-sm text-ink-3 hover:text-accent flex-shrink-0">← Pipeline</button>
          <h1 className="text-sm md:text-base font-semibold text-ink-1 truncate">{currentAsset?.label || 'New Target'}</h1>
          {currentAsset?.address && <span className="hidden md:inline text-xs text-ink-3 truncate">{currentAsset.address}</span>}
        </div>
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          {saveStatus === 'manual' && <span className="text-xs text-emerald-600">Saved ✓</span>}
          {saveStatus === 'auto'   && <span className="text-xs text-ink-3 hidden md:inline">Auto-saved</span>}
          {saveStatus === 'error'  && <span className="text-xs text-red-600">Save failed</span>}
          <button onClick={() => handleSave(false)} className="px-3 py-1.5 text-sm border border-hairline rounded text-ink-2 hover:bg-muted">Save</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-hairline bg-surface px-3 md:px-5 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id ? 'border-accent text-accent' : 'border-transparent text-ink-3 hover:text-ink-1'
            }`}
          >{tab.label}</button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'overview' && (
          <TargetOverview
            mapboxToken={mapboxToken}
            onAnalyze={handleAnalyze}
            parcelData={parcelData}
            marketData={marketData}
            loading={loading}
            mapCenter={mapCenter}
            parcelGeometry={parcelGeometry}
            notes={notes}
            onNotesChange={setNotes}
          />
        )}
        {activeTab === 'underwriting' && (
          <UnderwritingModel
            underwriting={underwriting}
            setUnderwriting={setUnderwriting}
            marketData={marketData}
          />
        )}
        {activeTab === 'map' && (
          <MapView
            mapboxToken={mapboxToken}
            center={mapCenter}
            parcelGeometry={parcelGeometry}
            parcelData={parcelData}
          />
        )}
      </div>
    </div>
  );
}
