import React, { useState } from 'react';
import { deleteAsset } from '../utils/api';
import { formatCurrency, formatPercent } from '../utils/formatters';

export default function SavedTargets({ assets, onLoad, onRefresh }) {
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (id) => {
    if (!confirm('Delete this target?')) return;
    setDeleting(id);
    try {
      await deleteAsset(id);
      onRefresh();
    } catch (e) {
      console.error('Delete failed:', e);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="h-[calc(100vh-100px)] overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-sm font-semibold text-gold uppercase tracking-wider mb-4">Saved Targets</h2>

        {assets.length === 0 ? (
          <div className="bg-navy-800 border border-navy-700 rounded-lg p-12 text-center">
            <p className="text-slate-secondary text-sm">No saved targets yet.</p>
            <p className="text-slate-secondary text-xs mt-1">Analyze a property and save it to see it here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {assets.map(asset => (
              <div key={asset.id} className="bg-navy-800 border border-navy-700 rounded-lg p-4 flex items-center justify-between hover:border-navy-600 transition-colors">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-slate-text">{asset.label || 'Untitled'}</h3>
                  <p className="text-xs text-slate-secondary mt-0.5">{asset.address}</p>
                  <p className="text-[10px] text-slate-secondary mt-1">
                    Saved {new Date(asset.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onLoad(asset.id)}
                    className="px-4 py-1.5 text-xs bg-gold/20 border border-gold/40 text-gold rounded hover:bg-gold/30 transition-colors"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => handleDelete(asset.id)}
                    disabled={deleting === asset.id}
                    className="px-3 py-1.5 text-xs text-red-400 border border-red-400/30 rounded hover:bg-red-400/10 transition-colors disabled:opacity-50"
                  >
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
