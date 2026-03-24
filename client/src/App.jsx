import React, { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from './components/Navbar';
import TargetOverview from './components/TargetOverview';
import UnderwritingModel from './components/UnderwritingModel';
import MapView from './components/MapView';
import SavedTargets from './components/SavedTargets';
import { fetchMapboxToken, fetchParcelData, fetchMarketData, saveAsset as saveAssetApi, listAssets, getAsset } from './utils/api';

const TABS = [
  { id: 'overview', label: 'Target Overview' },
  { id: 'underwriting', label: 'Underwriting' },
  { id: 'map', label: 'Map View' },
  { id: 'saved', label: 'Saved Targets' }
];

const defaultUnderwriting = {
  slipCategories: [],
  strUnits: [],
  otherRevenue: [],
  expenses: {
    mgmtFeeEnabled: true,
    mgmtFeePct: 6,
    propertyTaxes: 0,
    insurance: 0,
    utilities: 0,
    maintenanceMode: 'percent',
    maintenancePct: 5,
    maintenanceFlat: 0,
    payroll: 0,
    marketing: 0,
    otherOpex: 0
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

  // Load mapbox token on mount
  useEffect(() => {
    fetchMapboxToken().then(setMapboxToken).catch(console.error);
    loadSavedAssets();
  }, []);

  const loadSavedAssets = async () => {
    try {
      const assets = await listAssets();
      setSavedAssets(assets);
    } catch (e) {
      console.error('Failed to load assets:', e);
    }
  };

  // Auto-save every 30 seconds when asset is loaded
  useEffect(() => {
    if (!currentAsset?.id) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      handleSave(true);
    }, 30000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [underwriting, notes, currentAsset?.id]);

  const handleAnalyze = async (address, coords) => {
    setLoading(true);
    setParcelData(null);
    setMarketData(null);
    setParcelGeometry(null);

    try {
      const lat = coords?.lat;
      const lng = coords?.lng;

      const [parcel, market] = await Promise.all([
        fetchParcelData({ lat, lng, address }),
        fetchMarketData({ lat, lng, radius_miles: 10 })
      ]);

      setParcelData(parcel);
      setMarketData(market);

      if (parcel.geometry) {
        setParcelGeometry(parcel.geometry);
      }

      if (lat && lng) {
        setMapCenter({ lat, lng });
      }

      // Pre-fill STR defaults from market data
      if (market && !market.error && underwriting.strUnits.length === 0) {
        setUnderwriting(prev => ({
          ...prev,
          strUnits: prev.strUnits.length === 0 ? prev.strUnits : prev.strUnits.map(u => ({
            ...u,
            adr: market.avg_daily_rate || u.adr,
            occupancy: market.avg_occupancy || u.occupancy
          }))
        }));
      }

      // Set current asset context
      setCurrentAsset(prev => ({
        ...prev,
        address,
        lat,
        lng,
        label: prev?.label || address?.split(',')[0] || 'New Target'
      }));
    } catch (e) {
      console.error('Analysis failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (isAutoSave = false) => {
    if (!currentAsset?.address) return;

    try {
      const asset = {
        ...currentAsset,
        parcel: parcelData,
        market: marketData,
        underwriting,
        notes
      };
      const saved = await saveAssetApi(asset);
      setCurrentAsset(saved);
      setSaveStatus(isAutoSave ? 'auto' : 'manual');
      setTimeout(() => setSaveStatus(null), 3000);
      loadSavedAssets();
    } catch (e) {
      console.error('Save failed:', e);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleLoadAsset = async (id) => {
    try {
      setLoading(true);
      const asset = await getAsset(id);
      if (!asset) return;
      setCurrentAsset(asset);
      setParcelData(asset.parcel || null);
      setMarketData(asset.market || null);
      setUnderwriting(asset.underwriting || defaultUnderwriting);
      setNotes(asset.notes || '');
      if (asset.parcel?.geometry) setParcelGeometry(asset.parcel.geometry);
      if (asset.lat && asset.lng) setMapCenter({ lat: asset.lat, lng: asset.lng });
      setActiveTab('overview');
    } catch (e) {
      console.error('Load failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleNewTarget = () => {
    setCurrentAsset(null);
    setParcelData(null);
    setMarketData(null);
    setUnderwriting(defaultUnderwriting);
    setMapCenter(null);
    setParcelGeometry(null);
    setNotes('');
    setActiveTab('overview');
  };

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col">
      <Navbar
        savedAssets={savedAssets}
        onLoadAsset={handleLoadAsset}
        onNewTarget={handleNewTarget}
        onSave={() => handleSave(false)}
        saveStatus={saveStatus}
        currentLabel={currentAsset?.label}
        onLabelChange={(label) => setCurrentAsset(prev => ({ ...prev, label }))}
      />

      {/* Tabs */}
      <div className="flex border-b border-navy-700 px-6">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'tab-active text-gold'
                : 'text-slate-secondary hover:text-slate-text border-b-2 border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
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
        {activeTab === 'saved' && (
          <SavedTargets
            assets={savedAssets}
            onLoad={handleLoadAsset}
            onRefresh={loadSavedAssets}
            underwriting={underwriting}
          />
        )}
      </div>
    </div>
  );
}
