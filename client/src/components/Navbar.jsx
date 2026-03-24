import React, { useState } from 'react';

export default function Navbar({ savedAssets, onLoadAsset, onNewTarget, onSave, saveStatus, currentLabel, onLabelChange }) {
  const [editingLabel, setEditingLabel] = useState(false);

  return (
    <nav className="flex items-center justify-between px-6 py-3 bg-navy-800 border-b border-navy-700">
      {/* Left: Wordmark */}
      <div className="flex items-center gap-3">
        <div className="text-gold text-xl">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="3"/>
            <line x1="12" y1="8" x2="12" y2="22"/>
            <path d="M5 12h14"/>
            <path d="M5 12c0 4 3 7 7 10"/>
            <path d="M19 12c0 4-3 7-7 10"/>
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-slate-text tracking-tight">RDM Deal Tool</h1>
          <p className="text-[10px] text-slate-secondary uppercase tracking-widest">Fund I — Marina & Hospitality</p>
        </div>
      </div>

      {/* Center: Asset selector + label */}
      <div className="flex items-center gap-4">
        {currentLabel && (
          editingLabel ? (
            <input
              type="text"
              value={currentLabel}
              onChange={(e) => onLabelChange(e.target.value)}
              onBlur={() => setEditingLabel(false)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingLabel(false)}
              autoFocus
              className="bg-navy-900 border border-navy-700 rounded px-3 py-1.5 text-sm text-slate-text focus:outline-none focus:border-gold"
            />
          ) : (
            <button
              onClick={() => setEditingLabel(true)}
              className="text-sm text-gold hover:text-gold-light font-medium"
              title="Click to rename"
            >
              {currentLabel}
            </button>
          )
        )}
        <select
          onChange={(e) => e.target.value && onLoadAsset(e.target.value)}
          className="bg-navy-900 border border-navy-700 rounded px-3 py-1.5 text-sm text-slate-text focus:outline-none focus:border-gold cursor-pointer"
          defaultValue=""
        >
          <option value="" disabled>Load saved target...</option>
          {savedAssets.map(a => (
            <option key={a.id} value={a.id}>{a.label || a.address}</option>
          ))}
        </select>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {saveStatus === 'manual' && (
          <span className="text-xs text-green-400">Saved ✓</span>
        )}
        {saveStatus === 'auto' && (
          <span className="text-xs text-slate-secondary">Auto-saved ✓</span>
        )}
        {saveStatus === 'error' && (
          <span className="text-xs text-red-400">Save failed</span>
        )}
        <button
          onClick={onSave}
          className="px-4 py-1.5 text-sm bg-navy-700 hover:bg-navy-600 text-slate-text rounded border border-navy-700 transition-colors"
        >
          Save
        </button>
        <button
          onClick={onNewTarget}
          className="px-4 py-1.5 text-sm bg-gold hover:bg-gold-light text-navy-900 rounded font-medium transition-colors"
        >
          + New Target
        </button>
      </div>
    </nav>
  );
}
