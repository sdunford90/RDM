import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import TargetOverview from './components/TargetOverview';
import UnderwritingModel from './components/UnderwritingModel';
import MapView from './components/MapView';
import SavedTargets from './components/SavedTargets';
import { fetchMapboxToken, fetchParcelData, fetchMarketData, saveAsset as saveAssetApi, listAssets, getAsset } from './utils/api';

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'underwriting', label: 'Underwriting', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
  { id: 'map', label: 'Map', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
  { id: 'saved', label: 'Targets', icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4' }
];

const defaultUnderwriting = {
  slipCategories: [],
  strUnits: [],
  otherRevenue: [],
  expenses: {
    mgmtFeeEnabled: true, mgmtFeePct: 6, propertyTaxes: 0, insurance: 0,
    utilities: 0, maintenanceMode: 'percent', maintenancePct: 5, maintenanceFlat: 0,
    payroll: 0, marketing: 0, otherOpex: 0
  },
  purchasePrice: 0,
  targetCapRate: 7
};

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [mapboxToken, setMapboxToken] = useState(null);
  const [currentAsset, setCurrentAsset] = useState(null);
  const [savedAssets, setSavedAssets] = useState([]);
  const [parcelData, setParcelData] = useState(null);
  const [marketData, setMarketData] = useState(null);
  const [underwriting, setUnderwriting] = useState(defaultUnderwriting);
  const [mapCenter, setMapCenter] = useState(null);
  const [parcelGeometry, setParcelGeometry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [notes, setNotes] = useState('');
  const autoSaveTimer = useRef(null);

  useEffect(() => {
    fetchMapboxToken().then(setMapboxToken).catch(console.error);
    loadSavedAssets();
  }, []);

  const loadSavedAssets = async () => {
    try { setSavedAssets(await listAssets()); } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (!currentAsset?.id) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => handleSave(true), 30000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [underwriting, notes, currentAsset?.id]);

  const handleAnalyze = async (address, coords) => {
    setLoading(true);
    setParcelData(null); setMarketData(null); setParcelGeometry(null);
    try {
      const { lat, lng } = coords || {};
      const [parcel, market] = await Promise.all([
        fetchParcelData({ lat, lng, address }),
        fetchMarketData({ lat, lng, radius_miles: 10 })
      ]);
      setParcelData(parcel); setMarketData(market);
      if (parcel.geometry) setParcelGeometry(parcel.geometry);
      if (lat && lng) setMapCenter({ lat, lng });
      setUnderwriting(prev => {
        const next = { ...prev, expenses: { ...prev.expenses } };
        if (parcel?.tax?.taxamt && !prev.expenses.propertyTaxes) next.expenses.propertyTaxes = Number(parcel.tax.taxamt) || 0;
        return next;
      });
      const locationName = parcel?.identity?.location_name;
      setCurrentAsset(prev => ({ ...prev, address, lat, lng, label: prev?.label || locationName || address?.split(',')[0] || 'New Target' }));
    } catch (e) { console.error('Analysis failed:', e); }
    finally { setLoading(false); }
  };

  const handleSave = async (isAutoSave = false) => {
    if (!currentAsset?.address) return;
    try {
      const saved = await saveAssetApi({ ...currentAsset, parcel: parcelData, market: marketData, underwriting, notes });
      setCurrentAsset(saved);
      setSaveStatus(isAutoSave ? 'auto' : 'manual');
      setTimeout(() => setSaveStatus(null), 3000);
      loadSavedAssets();
    } catch (e) { setSaveStatus('error'); setTimeout(() => setSaveStatus(null), 3000); }
  };

  const handleLoadAsset = async (id) => {
    setLoading(true);
    try {
      const asset = await getAsset(id);
      if (!asset) return;
      setCurrentAsset(asset); setParcelData(asset.parcel || null); setMarketData(asset.market || null);
      setUnderwriting(asset.underwriting || defaultUnderwriting); setNotes(asset.notes || '');
      if (asset.parcel?.geometry) setParcelGeometry(asset.parcel.geometry);
      if (asset.lat && asset.lng) setMapCenter({ lat: asset.lat, lng: asset.lng });
      setActiveTab('overview');
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleNewTarget = () => {
    setCurrentAsset(null); setParcelData(null); setMarketData(null);
    setUnderwriting(defaultUnderwriting); setMapCenter(null); setParcelGeometry(null);
    setNotes(''); setActiveTab('overview');
  };

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col">
      <Navbar
        savedAssets={savedAssets} onLoadAsset={handleLoadAsset} onNewTarget={handleNewTarget}
        onSave={() => handleSave(false)} saveStatus={saveStatus}
        currentLabel={currentAsset?.label} onLabelChange={(label) => setCurrentAsset(prev => ({ ...prev, label }))}
      />

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-6 py-1 bg-surface-1 border-b border-border">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-surface-3 text-text-primary shadow-sm'
                : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-2'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
            </svg>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'overview' && (
          <TargetOverview mapboxToken={mapboxToken} onAnalyze={handleAnalyze} parcelData={parcelData}
            marketData={marketData} loading={loading} mapCenter={mapCenter} parcelGeometry={parcelGeometry}
            notes={notes} onNotesChange={setNotes} />
        )}
        {activeTab === 'underwriting' && (
          <UnderwritingModel underwriting={underwriting} setUnderwriting={setUnderwriting}
            marketData={marketData} parcelData={parcelData} />
        )}
        {activeTab === 'map' && (
          <MapView mapboxToken={mapboxToken} center={mapCenter} parcelGeometry={parcelGeometry} parcelData={parcelData} />
        )}
        {activeTab === 'saved' && (
          <SavedTargets assets={savedAssets} onLoad={handleLoadAsset} onRefresh={loadSavedAssets} />
        )}
      </div>
    </div>
  );
}
