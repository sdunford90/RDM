import React, { useState } from 'react';

export default function Navbar({ savedAssets, onLoadAsset, onNewTarget, onSave, saveStatus, currentLabel, onLabelChange }) {
  const [editingLabel, setEditingLabel] = useState(false);

  return (
    <nav className="flex items-center justify-between px-6 h-14 bg-surface-0 border-b border-border">
      {/* Left: Brand */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
          <svg className="w-4.5 h-4.5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text-primary tracking-tight">RDM</span>
          <span className="text-text-tertiary text-xs">/</span>
          <span className="text-xs text-text-secondary">Deal Tool</span>
        </div>
      </div>

      {/* Center: Asset label + selector */}
      <div className="flex items-center gap-3">
        {currentLabel && (
          editingLabel ? (
            <input type="text" value={currentLabel}
              onChange={(e) => onLabelChange(e.target.value)}
              onBlur={() => setEditingLabel(false)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingLabel(false)}
              autoFocus
              className="bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent focus-ring w-56"
            />
          ) : (
            <button onClick={() => setEditingLabel(true)}
              className="text-sm text-text-primary hover:text-accent font-medium px-2 py-1 rounded-md hover:bg-surface-2 transition-all" title="Click to rename">
              {currentLabel}
            </button>
          )
        )}
        <select onChange={(e) => e.target.value && onLoadAsset(e.target.value)} defaultValue=""
          className="bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-xs text-text-secondary focus:outline-none focus:border-accent cursor-pointer hover:border-border-hover transition-colors">
          <option value="" disabled>Load target...</option>
          {savedAssets.map(a => (
            <option key={a.id} value={a.id}>{a.label || a.address}</option>
          ))}
        </select>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {saveStatus === 'manual' && <span className="text-xs text-positive font-medium">Saved</span>}
        {saveStatus === 'auto' && <span className="text-xs text-text-tertiary">Auto-saved</span>}
        {saveStatus === 'error' && <span className="text-xs text-negative">Failed</span>}
        <button onClick={onSave}
          className="px-3.5 py-1.5 text-xs font-medium text-text-secondary bg-surface-2 hover:bg-surface-3 border border-border hover:border-border-hover rounded-lg transition-all">
          Save
        </button>
        <button onClick={onNewTarget}
          className="px-3.5 py-1.5 text-xs font-medium text-white bg-accent hover:bg-accent-light rounded-lg transition-all shadow-sm">
          New Target
        </button>
      </div>
    </nav>
  );
}
