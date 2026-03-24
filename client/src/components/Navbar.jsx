import React, { useState } from 'react';

export default function Navbar({ savedAssets, onLoadAsset, onNewTarget, onSave, saveStatus, currentLabel, onLabelChange }) {
  const [editingLabel, setEditingLabel] = useState(false);

  return (
    <nav className="flex items-center justify-between px-6 h-14 bg-white border-b border-border">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center shadow-glow-violet">
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold gradient-text tracking-tight">RDM</span>
          <span className="text-border text-xs">/</span>
          <span className="text-xs font-medium text-text-tertiary">Deal Tool</span>
        </div>
      </div>

      {/* Center */}
      <div className="flex items-center gap-3">
        {currentLabel && (
          editingLabel ? (
            <input type="text" value={currentLabel}
              onChange={(e) => onLabelChange(e.target.value)}
              onBlur={() => setEditingLabel(false)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingLabel(false)}
              autoFocus
              className="bg-surface-2 border border-border rounded-xl px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent focus:shadow-input-focus w-56 transition-all" />
          ) : (
            <button onClick={() => setEditingLabel(true)}
              className="text-sm text-text-primary hover:text-accent font-semibold px-3 py-1.5 rounded-xl hover:bg-violet-50 transition-all" title="Rename">
              {currentLabel}
            </button>
          )
        )}
        <select onChange={(e) => e.target.value && onLoadAsset(e.target.value)} defaultValue=""
          className="bg-surface-2 border border-border rounded-xl px-3 py-1.5 text-xs text-text-secondary focus:outline-none focus:border-accent hover:border-border-hover cursor-pointer transition-all">
          <option value="" disabled>Load target...</option>
          {savedAssets.map(a => <option key={a.id} value={a.id}>{a.label || a.address}</option>)}
        </select>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2.5">
        {saveStatus === 'manual' && <span className="text-xs text-positive font-semibold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-positive" />Saved</span>}
        {saveStatus === 'auto' && <span className="text-xs text-text-tertiary">Auto-saved</span>}
        {saveStatus === 'error' && <span className="text-xs text-negative font-medium">Failed</span>}
        <button onClick={onSave}
          className="px-4 py-1.5 text-xs font-medium text-text-secondary bg-white hover:bg-surface-2 border border-border hover:border-border-hover rounded-xl shadow-soft transition-all">
          Save
        </button>
        <button onClick={onNewTarget}
          className="px-4 py-1.5 text-xs font-semibold text-white bg-gradient-brand hover:opacity-90 rounded-xl shadow-glow-violet transition-all">
          + New Target
        </button>
      </div>
    </nav>
  );
}
