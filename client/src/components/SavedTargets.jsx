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
    <div className="h-[calc(100vh-108px)] overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">Saved Targets</h2>
          <span className="text-xs text-text-tertiary">{assets.length} total</span>
        </div>

        {assets.length === 0 ? (
          <div className="bg-surface-2 border border-border rounded-xl p-16 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-surface-3 flex items-center justify-center">
              <svg className="w-6 h-6 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-text-secondary text-sm">No targets yet</p>
            <p className="text-text-tertiary text-xs mt-1">Analyze a property to get started</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {assets.map(asset => (
              <div key={asset.id} className="group bg-surface-2 border border-border rounded-xl p-4 flex items-center justify-between hover:border-border-hover hover:shadow-card transition-all cursor-pointer"
                onClick={() => onLoad(asset.id)}>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-text-primary truncate">{asset.label || 'Untitled'}</h3>
                  <p className="text-xs text-text-tertiary mt-0.5 truncate">{asset.address}</p>
                  <p className="text-[10px] text-text-tertiary mt-1">{new Date(asset.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); onLoad(asset.id); }}
                    className="px-3 py-1.5 text-[11px] font-medium bg-accent/10 text-accent-text rounded-lg hover:bg-accent/20 transition-colors">
                    Load
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(asset.id); }} disabled={deleting === asset.id}
                    className="px-2.5 py-1.5 text-[11px] text-text-tertiary hover:text-negative rounded-lg hover:bg-negative/10 transition-colors disabled:opacity-50">
                    {deleting === asset.id ? '...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
