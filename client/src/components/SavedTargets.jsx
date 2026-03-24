import React, { useState } from 'react';
import { deleteAsset } from '../utils/api';

export default function SavedTargets({ assets, onLoad, onRefresh }) {
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (id) => {
    if (!confirm('Delete this target?')) return;
    setDeleting(id);
    try { await deleteAsset(id); onRefresh(); } catch (e) { console.error(e); }
    finally { setDeleting(null); }
  };

  return (
    <div className="h-[calc(100vh-108px)] overflow-y-auto p-6 bg-surface-1">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-text-primary">Saved Targets</h2>
          <span className="text-xs font-medium text-text-tertiary bg-surface-2 px-2.5 py-1 rounded-lg">{assets.length} total</span>
        </div>

        {assets.length === 0 ? (
          <div className="bg-white border border-border rounded-3xl p-16 text-center shadow-soft">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-brand-soft flex items-center justify-center">
              <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-text-primary font-semibold">No targets yet</p>
            <p className="text-text-tertiary text-sm mt-1">Analyze a property to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {assets.map((asset, i) => {
              const colors = ['border-l-violet-400', 'border-l-pink-400', 'border-l-teal-400', 'border-l-sky-400', 'border-l-amber-400', 'border-l-emerald-400'];
              return (
                <div key={asset.id}
                  className={`group bg-white border border-border border-l-[3px] ${colors[i % colors.length]} rounded-2xl p-4 flex items-center justify-between hover:shadow-card hover:border-border-hover transition-all cursor-pointer`}
                  onClick={() => onLoad(asset.id)}>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-text-primary truncate">{asset.label || 'Untitled'}</h3>
                    <p className="text-xs text-text-tertiary mt-0.5 truncate">{asset.address}</p>
                    <p className="text-[10px] text-text-tertiary mt-1 font-medium">{new Date(asset.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                  <div className="flex items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
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
