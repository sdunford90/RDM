import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import Avatar from './Avatar';
import { useAuth } from '../hooks/useAuth';
import { useIsMobile } from '../hooks/useMediaQuery';

export default function TopNav() {
  const { user, mode, signOut } = useAuth();
  const nav = useNavigate();
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);

  const linkClass = ({ isActive }) =>
    `px-3 py-1.5 text-sm rounded-md transition-colors ${
      isActive ? 'bg-accent-subtle text-accent font-medium' : 'text-ink-2 hover:bg-muted'
    }`;

  return (
    <nav className="flex items-center justify-between px-3 md:px-5 py-2 md:py-2.5 bg-surface border-b border-hairline">
      <div className="flex items-center gap-3 md:gap-6 min-w-0">
        <div
          className="flex items-center gap-2 cursor-pointer flex-shrink-0"
          onClick={() => nav('/pipeline')}
          title="RDM"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0E7490" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="3" />
            <line x1="12" y1="8" x2="12" y2="22" />
            <path d="M5 12h14" />
            <path d="M5 12c0 4 3 7 7 10" />
            <path d="M19 12c0 4-3 7-7 10" />
          </svg>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-ink-1">RDM</div>
            <div className="hidden sm:block text-[9px] uppercase tracking-widest text-ink-3 -mt-0.5">Marina Pipeline</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <NavLink to="/pipeline" className={linkClass}>Pipeline</NavLink>
          <NavLink to="/triage" className={linkClass}>Triage</NavLink>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        {mode === 'dev' && !isMobile && (
          <span
            className="text-[10px] uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded"
            title="Set GOOGLE_CLIENT_ID + AUTH_ALLOWLIST env vars to enable real sign-in"
          >Dev auth</span>
        )}
        {user && (
          isMobile ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-muted"
                aria-label="Account menu"
              >
                <Avatar user={user} size={28} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-56 bg-surface border border-hairline rounded-lg shadow-pop z-40 py-1">
                    <div className="px-3 py-2 border-b border-hairline">
                      <div className="text-sm font-medium text-ink-1 truncate">{user.name || user.email}</div>
                      {user.name && <div className="text-xs text-ink-3 truncate">{user.email}</div>}
                      {mode === 'dev' && <div className="text-[10px] uppercase tracking-wider text-amber-700 mt-1">Dev auth</div>}
                    </div>
                    <button
                      onClick={() => { setMenuOpen(false); signOut(); }}
                      className="w-full text-left px-3 py-2 text-sm text-ink-2 hover:bg-muted"
                    >Sign out</button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Avatar user={user} size={26} />
              <div className="leading-tight">
                <div className="text-sm text-ink-1">{user.name || user.email}</div>
                <button onClick={signOut} className="text-[11px] text-ink-3 hover:text-accent">Sign out</button>
              </div>
            </div>
          )
        )}
      </div>
    </nav>
  );
}
