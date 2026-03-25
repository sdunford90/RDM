import React, { useState } from 'react';
import { deleteAsset } from '../utils/api';

const STAGES = [
  { id: 'lead', label: 'Lead', color: 'bg-gray-400' },
  { id: 'review', label: 'Review', color: 'bg-amber-400' },
  { id: 'loi', label: 'LOI', color: 'bg-blue-500' },
  { id: 'dd', label: 'DD', color: 'bg-violet-500' },
  { id: 'closed', label: 'Closed', color: 'bg-emerald-500' },
  { id: 'passed', label: 'Passed', color: 'bg-red-400' }
];

const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.id, s]));

function StageBadge({ stage }) {
  const s = STAGE_MAP[stage] || STAGES[0];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider text-white ${s.color}`}>
      {s.label}
    </span>
  );
}

function fmt$(n) { if (!n) return null; return n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : n >= 1000 ? `$${(n/1000).toFixed(0)}K` : `$${Math.round(n)}`; }
function fmtPct(n) { if (!n) return null; return `${typeof n === 'number' && n <= 1 ? Math.round(n * 100) : Math.round(n)}%`; }

function MetricPill({ label, value, color = 'text-text-primary' }) {
  if (!value) return null;
  return (
    <div className="flex flex-col">
      <span className="text-[8px] text-text-tertiary uppercase tracking-wider leading-none">{label}</span>
      <span className={`text-[11px] font-mono font-semibold leading-tight ${color}`}>{value}</span>
    </div>
  );
}

function extractMetrics(asset) {
  const m = asset.market || {};
  const p = asset.parcel || {};
  const u = asset.underwriting || {};
  const dd = m.deepDive || {};
  const ddMetrics = dd.allMetrics || {};
  const ddPacing = dd.pacing || null;

  const adr = m.summary?.avg_daily_rate || m.avg_daily_rate;
  const occ = m.summary?.avg_occupancy || m.avg_occupancy;
  const annualRev = m.estimate?.projected_annual_revenue || m.calculator_estimate?.projected_annual_revenue;
  const monthlyRev = m.summary?.avg_monthly_revenue || m.avg_monthly_revenue;
  const activeListings = m.summary?.active_listings || m.active_listings;
  const purchasePrice = u.purchasePrice;
  const capRate = u.targetCapRate;
  const acreage = p.physical?.ll_gisacre;
  const taxBill = p.tax?.taxamt;
  const assessed = p.tax?.parval;
  const zoning = p.landuse?.usedesc || p.landuse?.zoning;
  const owner = p.ownership?.owner;

  // Deep dive TTM stats
  const ttmAdr = ddMetrics.adr?.ttm_average;
  const ttmOcc = ddMetrics.occupancy?.ttm_average;
  const ttmRevpar = ddMetrics.revpar?.ttm_average;
  const ttmRevenue = ddMetrics.revenue?.ttm_average;
  const activeSupply = ddMetrics.supply?.current;
  const pacingFill = ddPacing?.pace_occupancy;
  const pacingYoy = ddPacing?.yoy_change;
  const marketName = dd.market?.market_name || dd.market?.locality || null;

  return { adr, occ, annualRev, monthlyRev, activeListings, purchasePrice, capRate, acreage, taxBill, assessed, zoning, owner, ttmAdr, ttmOcc, ttmRevpar, ttmRevenue, activeSupply, pacingFill, pacingYoy, marketName };
}

export default function SavedTargets({ assets, onLoad, onRefresh, onStageChange, onCompare, compareIds = [], setCompareIds }) {
  const [deleting, setDeleting] = useState(null);
  const [filterStage, setFilterStage] = useState('all');

  const handleDelete = async (id) => {
    if (!confirm('Delete this target?')) return;
    setDeleting(id);
    try { await deleteAsset(id); onRefresh(); } catch (e) { console.error(e); }
    finally { setDeleting(null); }
  };

  const toggleCompare = (id) => {
    setCompareIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const filteredAssets = filterStage === 'all' ? assets : assets.filter(a => (a.stage || 'lead') === filterStage);

  const stageCounts = {};
  assets.forEach(a => { const s = a.stage || 'lead'; stageCounts[s] = (stageCounts[s] || 0) + 1; });

  return (
    <div className="h-[calc(100vh-108px)] overflow-y-auto p-4 md:p-6 bg-surface-1">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-text-primary">Saved Targets</h2>
          <div className="flex items-center gap-2">
            {compareIds.length >= 2 && (
              <button onClick={() => onCompare(compareIds)}
                className="px-3.5 py-1.5 text-[11px] font-semibold bg-gradient-brand text-white rounded-lg shadow-glow-violet hover:opacity-90 transition-all">
                Compare ({compareIds.length})
              </button>
            )}
            {compareIds.length > 0 && (
              <button onClick={() => setCompareIds([])}
                className="px-2.5 py-1.5 text-[10px] text-text-tertiary hover:text-text-primary">
                Clear
              </button>
            )}
            <span className="text-xs font-medium text-text-tertiary bg-surface-2 px-2.5 py-1 rounded-lg">{assets.length} total</span>
          </div>
        </div>

        {/* Stage filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={() => setFilterStage('all')}
            className={`px-3 py-1.5 text-[10px] font-semibold rounded-lg transition-all ${filterStage === 'all' ? 'bg-violet-100 text-violet-700 border border-violet-200' : 'bg-surface-2 text-text-tertiary hover:bg-surface-3 border border-transparent'}`}>
            All ({assets.length})
          </button>
          {STAGES.map(s => {
            const count = stageCounts[s.id] || 0;
            if (count === 0) return null;
            return (
              <button key={s.id} onClick={() => setFilterStage(s.id)}
                className={`px-3 py-1.5 text-[10px] font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  filterStage === s.id ? 'bg-violet-100 text-violet-700 border border-violet-200' : 'bg-surface-2 text-text-tertiary hover:bg-surface-3 border border-transparent'
                }`}>
                <span className={`w-2 h-2 rounded-full ${s.color}`} />
                {s.label} ({count})
              </button>
            );
          })}
        </div>

        {filteredAssets.length === 0 ? (
          <div className="bg-white border border-border rounded-3xl p-16 text-center shadow-soft">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-brand-soft flex items-center justify-center">
              <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-text-primary font-semibold">{assets.length === 0 ? 'No targets yet' : 'No targets in this stage'}</p>
            <p className="text-text-tertiary text-sm mt-1">{assets.length === 0 ? 'Analyze a property to get started' : 'Try a different filter'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAssets.map((asset, i) => {
              const colors = ['border-l-violet-400', 'border-l-pink-400', 'border-l-teal-400', 'border-l-sky-400', 'border-l-amber-400', 'border-l-emerald-400'];
              const isSelected = compareIds.includes(asset.id);
              const mx = extractMetrics(asset);
              const hasMarket = mx.adr || mx.annualRev || mx.occ;
              const hasProperty = mx.purchasePrice || mx.acreage || mx.assessed;
              const hasDeepDive = mx.ttmAdr || mx.ttmOcc || mx.ttmRevpar || mx.pacingFill;

              return (
                <div key={asset.id}
                  className={`group bg-white border ${isSelected ? 'border-violet-300 ring-1 ring-violet-200' : 'border-border'} border-l-[3px] ${colors[i % colors.length]} rounded-2xl p-4 hover:shadow-card hover:border-border-hover transition-all cursor-pointer`}
                  onClick={() => onLoad(asset.id)}>

                  {/* Top row: name + stage + actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <input type="checkbox" checked={isSelected}
                        onClick={e => e.stopPropagation()}
                        onChange={() => toggleCompare(asset.id)}
                        className="w-4 h-4 mt-0.5 rounded border-border text-violet-500 focus:ring-violet-300 cursor-pointer flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-text-primary truncate">{asset.label || 'Untitled'}</h3>
                          <StageBadge stage={asset.stage || 'lead'} />
                        </div>
                        <p className="text-xs text-text-tertiary mt-0.5 truncate">{asset.address}</p>
                        {mx.owner && <p className="text-[10px] text-text-tertiary mt-0.5 truncate">Owner: <span className="text-text-secondary font-medium">{mx.owner}</span></p>}
                      </div>
                    </div>

                    {/* Actions — visible on hover desktop, always on mobile */}
                    <div className="flex items-center gap-1.5 sm:opacity-0 sm:group-hover:opacity-100 transition-all flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <select value={asset.stage || 'lead'}
                        onChange={e => onStageChange(asset.id, e.target.value)}
                        className="bg-surface-2 border border-border rounded-lg px-2 py-1 text-[10px] text-text-secondary cursor-pointer">
                        {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                      <button onClick={() => onLoad(asset.id)}
                        className="px-3 py-1.5 text-[11px] font-semibold bg-gradient-brand text-white rounded-lg shadow-glow-violet hover:opacity-90 transition-all">
                        Load
                      </button>
                      <button onClick={() => handleDelete(asset.id)} disabled={deleting === asset.id}
                        className="px-2.5 py-1.5 text-[11px] font-medium text-text-tertiary hover:text-negative rounded-lg hover:bg-red-50 transition-all disabled:opacity-50">
                        {deleting === asset.id ? '...' : 'Del'}
                      </button>
                    </div>
                  </div>

                  {/* Metrics row */}
                  {(hasMarket || hasProperty) && (
                    <div className="mt-3 pt-3 border-t border-border/60 flex flex-wrap gap-x-4 gap-y-2">
                      {/* STR Market metrics */}
                      {hasMarket && (
                        <>
                          <MetricPill label="Annual Rev" value={fmt$(mx.annualRev)} color="text-emerald-600" />
                          <MetricPill label="ADR" value={mx.adr ? `$${Math.round(mx.adr)}/nt` : null} color="text-violet-600" />
                          <MetricPill label="Occupancy" value={fmtPct(mx.occ)} color="text-pink-600" />
                          <MetricPill label="Monthly Rev" value={fmt$(mx.monthlyRev)} color="text-sky-600" />
                          <MetricPill label="Active Listings" value={mx.activeListings ? String(mx.activeListings) : null} />
                        </>
                      )}
                      {/* Property metrics */}
                      {mx.purchasePrice > 0 && <MetricPill label="Ask Price" value={fmt$(mx.purchasePrice)} color="text-amber-600" />}
                      {mx.assessed > 0 && <MetricPill label="Assessed" value={fmt$(mx.assessed)} />}
                      {mx.acreage && <MetricPill label="Acreage" value={`${parseFloat(mx.acreage).toFixed(1)} ac`} />}
                      {mx.taxBill > 0 && <MetricPill label="Tax Bill" value={fmt$(mx.taxBill)} />}
                      {mx.capRate > 0 && <MetricPill label="Target Cap" value={`${mx.capRate}%`} color="text-violet-600" />}
                      {mx.zoning && <MetricPill label="Use" value={mx.zoning.length > 20 ? mx.zoning.slice(0, 20) + '…' : mx.zoning} />}
                    </div>
                  )}

                  {/* Deep dive TTM metrics */}
                  {hasDeepDive && (
                    <div className="mt-2 pt-2 border-t border-dashed border-border/60">
                      <p className="text-[8px] font-bold text-text-tertiary uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block" />
                        60-Mo Market {mx.marketName ? `· ${mx.marketName}` : ''}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                        <MetricPill label="TTM ADR" value={mx.ttmAdr ? `$${Math.round(mx.ttmAdr)}/nt` : null} color="text-violet-600" />
                        <MetricPill label="TTM Occ" value={mx.ttmOcc ? `${Math.round(mx.ttmOcc)}%` : null} color="text-pink-600" />
                        <MetricPill label="TTM RevPAR" value={mx.ttmRevpar ? `$${Math.round(mx.ttmRevpar)}` : null} color="text-sky-600" />
                        <MetricPill label="TTM Revenue" value={fmt$(mx.ttmRevenue)} color="text-emerald-600" />
                        <MetricPill label="Supply" value={mx.activeSupply ? String(Math.round(mx.activeSupply)) : null} />
                        {mx.pacingFill != null && (
                          <MetricPill label="Fwd Pacing" value={`${Math.round(mx.pacingFill)}% booked`}
                            color={mx.pacingFill >= 60 ? 'text-emerald-600' : mx.pacingFill >= 40 ? 'text-amber-600' : 'text-red-500'} />
                        )}
                        {mx.pacingYoy != null && (
                          <MetricPill label="Pacing YoY" value={`${mx.pacingYoy >= 0 ? '+' : ''}${Math.round(mx.pacingYoy)}%`}
                            color={mx.pacingYoy >= 0 ? 'text-emerald-600' : 'text-red-500'} />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Notes snippet */}
                  {asset.notes && asset.notes.trim() && (
                    <p className="mt-2 text-[10px] text-text-tertiary italic line-clamp-1">
                      "{asset.notes.trim().slice(0, 120)}"
                    </p>
                  )}

                  {/* Footer */}
                  <p className="mt-2 text-[9px] text-text-tertiary">
                    Updated {new Date(asset.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
