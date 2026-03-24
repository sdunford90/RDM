import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import TargetOverview from './components/TargetOverview';
import UnderwritingModel from './components/UnderwritingModel';
import MapView from './components/MapView';
import SavedTargets from './components/SavedTargets';
import LoginPage from './components/LoginPage';
import AdminPanel from './components/AdminPanel';
import { useAuth } from './hooks/useAuth';
import { fetchMapboxToken, fetchParcelData, fetchAdjacentParcels, fetchMarketData, fetchRevenueEstimate, saveAsset as saveAssetApi, listAssets, getAsset } from './utils/api';

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'underwriting', label: 'Underwriting', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
  { id: 'map', label: 'Map', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
  { id: 'saved', label: 'Targets', icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4' }
];

const defaultUnderwriting = {
  slipCategories: [], strUnits: [], otherRevenue: [],
  expenses: { mgmtFeeEnabled: true, mgmtFeePct: 6, propertyTaxes: 0, insurance: 0, utilities: 0, maintenanceMode: 'percent', maintenancePct: 5, maintenanceFlat: 0, payroll: 0, marketing: 0, otherOpex: 0 },
  purchasePrice: 0, targetCapRate: 7
};

export default function App() {
  const { user, loading: authLoading, isAuthenticated, isAdmin } = useAuth();

  // All hooks must be called unconditionally before any early returns
  const [activeTab, setActiveTab] = useState('overview');
  const [mapboxToken, setMapboxToken] = useState(null);
  const [currentAsset, setCurrentAsset] = useState(null);
  const [savedAssets, setSavedAssets] = useState([]);
  const [parcelData, setParcelData] = useState(null);
  const [marketData, setMarketData] = useState(null);
  const [underwriting, setUnderwriting] = useState(defaultUnderwriting);
  const [mapCenter, setMapCenter] = useState(null);
  const [parcelGeometry, setParcelGeometry] = useState(null);
  const [adjacentParcels, setAdjacentParcels] = useState([]);
  const [adjacentParcelsLoading, setAdjacentParcelsLoading] = useState(false);
  const [strConfig, setStrConfig] = useState({ bedrooms: 2, baths: 1, guests: 4 });
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [notes, setNotes] = useState('');
  const autoSaveTimer = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchMapboxToken().then(setMapboxToken).catch(console.error);
    loadSavedAssets();
  }, [isAuthenticated]);

  const loadSavedAssets = async () => { try { setSavedAssets(await listAssets()); } catch (e) { console.error(e); } };

  useEffect(() => {
    if (!currentAsset?.id) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => handleSave(true), 30000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [underwriting, notes, currentAsset?.id]);

  const handleAnalyze = async (address, coords, radius_miles = 10) => {
    setLoading(true); setParcelData(null); setMarketData(null); setParcelGeometry(null); setAdjacentParcels([]); setAdjacentParcelsLoading(false);
    try {
      const { lat, lng } = coords || {};
      const [parcel, market, revEstimate] = await Promise.all([
        fetchParcelData({ lat, lng, address }),
        fetchMarketData({ lat, lng, radius_miles }),
        fetchRevenueEstimate({ lat, lng, ...strConfig }).catch(() => null),
      ]);
      // Merge revenue calculator estimate into market data if the radius search didn't produce one
      const enrichedMarket = { ...market };
      if (revEstimate && !revEstimate.error && (!market.estimate || !market.estimate.projected_annual_revenue)) {
        enrichedMarket.estimate = {
          projected_annual_revenue: revEstimate.projected_annual_revenue,
          projected_adr: revEstimate.projected_adr,
          projected_occupancy: revEstimate.projected_occupancy,
          comp_count: revEstimate.comp_count,
          monthly_revenue_breakdown: revEstimate.monthly_revenue_breakdown,
          ...(market.estimate || {})
        };
      }
      // Also store raw calculator estimate for reference
      enrichedMarket.calculator_estimate = revEstimate;
      setParcelData(parcel); setMarketData(enrichedMarket);
      if (parcel.geometry) setParcelGeometry(parcel.geometry);
      if (lat && lng) {
        setMapCenter({ lat, lng });
        // Fetch adjacent parcels in background (non-blocking)
        setAdjacentParcelsLoading(true);
        fetchAdjacentParcels({ lat, lng, radius: 400, limit: 50 })
          .then(data => { setAdjacentParcels(data.parcels || []); })
          .catch(e => { console.warn('Adjacent parcels failed:', e); setAdjacentParcels([]); })
          .finally(() => setAdjacentParcelsLoading(false));
      }
      setUnderwriting(prev => { const next = { ...prev, expenses: { ...prev.expenses } }; if (parcel?.tax?.taxamt && !prev.expenses.propertyTaxes) next.expenses.propertyTaxes = Number(parcel.tax.taxamt) || 0; return next; });
      setCurrentAsset(prev => ({ ...prev, address, lat, lng, label: prev?.label || parcel?.identity?.location_name || address?.split(',')[0] || 'New Target' }));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleSave = async (isAutoSave = false) => {
    if (!currentAsset?.address) return;
    try {
      const saved = await saveAssetApi({ ...currentAsset, parcel: parcelData, market: marketData, underwriting, notes, adjacentParcels });
      setCurrentAsset(saved); setSaveStatus(isAutoSave ? 'auto' : 'manual'); setTimeout(() => setSaveStatus(null), 3000); loadSavedAssets();
    } catch (e) { setSaveStatus('error'); setTimeout(() => setSaveStatus(null), 3000); }
  };

  const handleLoadAsset = async (id) => {
    setLoading(true);
    try {
      const asset = await getAsset(id); if (!asset) return;
      setCurrentAsset(asset); setParcelData(asset.parcel || null); setMarketData(asset.market || null);
      setUnderwriting(asset.underwriting || defaultUnderwriting); setNotes(asset.notes || '');
      setAdjacentParcels(asset.adjacentParcels || []);
      if (asset.parcel?.geometry) setParcelGeometry(asset.parcel.geometry);
      if (asset.lat && asset.lng) setMapCenter({ lat: asset.lat, lng: asset.lng });
      setActiveTab('overview');
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleReestimate = async (config) => {
    if (!mapCenter) return;
    const cfg = config || strConfig;
    try {
      const rev = await fetchRevenueEstimate({ lat: mapCenter.lat, lng: mapCenter.lng, ...cfg });
      if (!rev || rev.error) return;
      setMarketData(prev => prev ? { ...prev, calculator_estimate: rev, estimate: { ...(prev.estimate || {}), projected_annual_revenue: rev.projected_annual_revenue, projected_adr: rev.projected_adr, projected_occupancy: rev.projected_occupancy, comp_count: rev.comp_count } } : prev);
    } catch (e) { console.error('Reestimate failed:', e); }
  };

  const handleStrConfigChange = (cfg) => {
    setStrConfig(cfg);
  };

  const handleNewTarget = () => {
    setCurrentAsset(null); setParcelData(null); setMarketData(null);
    setUnderwriting(defaultUnderwriting); setMapCenter(null); setParcelGeometry(null); setAdjacentParcels([]); setNotes(''); setActiveTab('overview');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-accent border-t-transparent" />
          <p className="text-sm text-text-tertiary">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <LoginPage />;

  return (
    <div className="min-h-screen bg-surface-1 flex flex-col">
      <Navbar savedAssets={savedAssets} onLoadAsset={handleLoadAsset} onNewTarget={handleNewTarget}
        onSave={() => handleSave(false)} saveStatus={saveStatus}
        currentLabel={currentAsset?.label} onLabelChange={(label) => setCurrentAsset(prev => ({ ...prev, label }))}
        user={user} />

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 py-2 bg-gradient-to-r from-violet-50 via-fuchsia-50 to-pink-50 border-b border-violet-100">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-xl transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-brand text-white shadow-glow-violet'
                : 'text-violet-400 hover:text-violet-600 hover:bg-white/60'
            }`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
            </svg>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'overview' && <TargetOverview mapboxToken={mapboxToken} onAnalyze={handleAnalyze} parcelData={parcelData} marketData={marketData} adjacentParcels={adjacentParcels} adjacentParcelsLoading={adjacentParcelsLoading} strConfig={strConfig} onStrConfigChange={handleStrConfigChange} onReestimate={handleReestimate} loading={loading} mapCenter={mapCenter} parcelGeometry={parcelGeometry} notes={notes} onNotesChange={setNotes} />}
        {activeTab === 'underwriting' && <UnderwritingModel underwriting={underwriting} setUnderwriting={setUnderwriting} marketData={marketData} parcelData={parcelData} />}
        {activeTab === 'map' && <MapView mapboxToken={mapboxToken} center={mapCenter} parcelGeometry={parcelGeometry} parcelData={parcelData} adjacentParcels={adjacentParcels} />}
        {activeTab === 'saved' && (
          <div className="h-full overflow-y-auto">
            <SavedTargets assets={savedAssets} onLoad={handleLoadAsset} onRefresh={loadSavedAssets} />
            {isAdmin && (
              <div className="border-t border-border mt-4">
                <div className="px-5 pt-4 pb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-lg bg-gradient-brand flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    </div>
                    <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Admin</h2>
                  </div>
                </div>
                <AdminPanel currentUser={user} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
