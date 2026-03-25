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

  // Group counts for filters
  const stageCounts = {};
  assets.forEach(a => { const s = a.stage || 'lead'; stageCounts[s] = (stageCounts[s] || 0) + 1; });

  return (
    <div className="h-[calc(100vh-108px)] overflow-y-auto p-6 bg-surface-1">
      <div className="max-w-3xl mx-auto space-y-4">
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
          <div className="space-y-2">
            {filteredAssets.map((asset, i) => {
              const colors = ['border-l-violet-400', 'border-l-pink-400', 'border-l-teal-400', 'border-l-sky-400', 'border-l-amber-400', 'border-l-emerald-400'];
              const isSelected = compareIds.includes(asset.id);
              return (
                <div key={asset.id}
                  className={`group bg-white border ${isSelected ? 'border-violet-300 ring-1 ring-violet-200' : 'border-border'} border-l-[3px] ${colors[i % colors.length]} rounded-2xl p-4 flex items-center justify-between hover:shadow-card hover:border-border-hover transition-all cursor-pointer`}
                  onClick={() => onLoad(asset.id)}>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Compare checkbox */}
                    <input type="checkbox" checked={isSelected}
                      onClick={e => e.stopPropagation()}
                      onChange={() => toggleCompare(asset.id)}
                      className="w-4 h-4 rounded border-border text-violet-500 focus:ring-violet-300 cursor-pointer flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-text-primary truncate">{asset.label || 'Untitled'}</h3>
                        <StageBadge stage={asset.stage || 'lead'} />
                      </div>
                      <p className="text-xs text-text-tertiary mt-0.5 truncate">{asset.address}</p>
                      <p className="text-[10px] text-text-tertiary mt-1 font-medium">{new Date(asset.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                    {/* Stage selector */}
                    <select value={asset.stage || 'lead'}
                      onClick={e => e.stopPropagation()}
                      onChange={e => { e.stopPropagation(); onStageChange(asset.id, e.target.value); }}
                      className="bg-surface-2 border border-border rounded-lg px-2 py-1 text-[10px] text-text-secondary cursor-pointer">
                      {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                    <button onClick={(e) => { e.stopPropagation(); onLoad(asset.id); }}
                      className="px-3.5 py-2 text-[11px] font-semibold bg-gradient-brand text-white rounded-lg shadow-glow-violet hover:opacity-90 transition-all">
                      Load
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(asset.id); }} disabled={deleting === asset.id}
                      className="px-3 py-2 text-[11px] font-medium text-text-tertiary hover:text-negative rounded-lg hover:bg-red-50 transition-all disabled:opacity-50">
                      {deleting === asset.id ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
