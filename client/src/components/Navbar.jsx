import React, { useState, useEffect, useRef } from 'react';

export default function Navbar({ savedAssets, onLoadAsset, onNewTarget, onSave, saveStatus, currentLabel, onLabelChange, user }) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler); };
  }, [menuOpen]);

  const initials = user
    ? ((user.firstName?.[0] || '') + (user.lastName?.[0] || '') || user.email?.[0] || '?').toUpperCase()
    : '?';

  return (
    <nav className="flex items-center justify-between px-4 md:px-6 h-14 bg-white border-b border-border flex-shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center shadow-glow-violet flex-shrink-0">
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold gradient-text tracking-tight">RDM</span>
          <span className="text-border text-xs hidden sm:block">/</span>
          <span className="text-xs font-medium text-text-tertiary hidden sm:block">Deal Tool</span>
        </div>
      </div>

      {/* Center — hidden on mobile */}
      <div className="hidden md:flex items-center gap-3">
        {currentLabel && (
          editingLabel ? (
            <input type="text" value={currentLabel}
              onChange={(e) => onLabelChange(e.target.value)}
              onBlur={() => setEditingLabel(false)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingLabel(false)}
              autoFocus
              className="bg-surface-2 border border-border rounded-xl px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent focus:shadow-input-focus w-48 transition-all" />
          ) : (
            <button onClick={() => setEditingLabel(true)}
              className="text-sm text-text-primary hover:text-accent font-semibold px-3 py-1.5 rounded-xl hover:bg-violet-50 transition-all max-w-[180px] truncate" title="Rename">
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

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Save status — desktop only */}
        <div className="hidden md:flex items-center gap-2">
          {saveStatus === 'manual' && <span className="text-xs text-positive font-semibold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-positive" />Saved</span>}
          {saveStatus === 'auto' && <span className="text-xs text-text-tertiary">Auto-saved</span>}
          {saveStatus === 'error' && <span className="text-xs text-negative font-medium">Failed</span>}
          <button onClick={onSave}
            className="px-4 py-1.5 text-xs font-medium text-text-secondary bg-white hover:bg-surface-2 border border-border hover:border-border-hover rounded-xl shadow-soft transition-all">
            Save
          </button>
        </div>

        {/* New Target — icon on mobile, full button on desktop */}
        <button onClick={onNewTarget}
          className="flex items-center gap-1.5 px-3 md:px-4 py-1.5 text-xs font-semibold text-white bg-gradient-brand hover:opacity-90 rounded-xl shadow-glow-violet transition-all">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">New Target</span>
        </button>

        {/* User section */}
        {user && (
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen(o => !o)}
              className="flex items-center gap-2 pl-2 border-l border-border ml-0.5">
              {user.profileImageUrl
                ? <img src={user.profileImageUrl} className="w-7 h-7 rounded-full ring-2 ring-violet-200" alt={initials} />
                : <div className="w-7 h-7 rounded-full bg-gradient-brand flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-violet-200">{initials}</div>
              }
              <svg className={`w-3 h-3 text-text-tertiary hidden md:block transition-transform ${menuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-10 z-50 bg-white border border-border rounded-2xl shadow-card py-2 min-w-[160px]">
                <div className="px-4 py-2 border-b border-border mb-1">
                  <p className="text-xs font-semibold text-text-primary truncate">{user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email}</p>
                  <p className="text-[10px] text-text-tertiary truncate">{user.email}</p>
                </div>
                {/* Mobile-only: Save & Load */}
                <div className="md:hidden border-b border-border pb-1 mb-1">
                  <button onClick={() => { onSave(); setMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 text-xs font-medium text-text-secondary hover:bg-surface-2 transition-colors">
                    Save current target
                  </button>
                </div>
                <a href="/api/logout"
                  className="block px-4 py-2 text-xs font-medium text-negative hover:bg-red-50 transition-colors">
                  Sign out
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
