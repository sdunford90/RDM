import React, { useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { mode, googleClientId, signIn, error } = useAuth();
  const btnRef = useRef(null);

  useEffect(() => {
    if (mode !== 'google' || !googleClientId || !btnRef.current) return;
    if (!document.getElementById('google-gsi-script')) {
      const s = document.createElement('script');
      s.id = 'google-gsi-script';
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = init;
      document.head.appendChild(s);
    } else {
      init();
    }
    function init() {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: ({ credential }) => credential && signIn(credential)
      });
      window.google.accounts.id.renderButton(btnRef.current, { theme: 'outline', size: 'large', shape: 'rectangular', text: 'continue_with' });
    }
  }, [mode, googleClientId, signIn]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-md bg-surface border border-hairline rounded-xl shadow-card p-8">
        <div className="flex items-center gap-2 mb-6">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0E7490" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="3" /><line x1="12" y1="8" x2="12" y2="22" /><path d="M5 12h14" /><path d="M5 12c0 4 3 7 7 10" /><path d="M19 12c0 4-3 7-7 10" />
          </svg>
          <div>
            <h1 className="text-xl font-semibold text-ink-1">RDM Marina Pipeline</h1>
            <p className="text-xs text-ink-3 uppercase tracking-widest">Fund I — Marina & Hospitality</p>
          </div>
        </div>

        {mode === 'google' ? (
          <>
            <p className="text-sm text-ink-2 mb-6">Sign in with a whitelisted Google account to access the pipeline.</p>
            <div ref={btnRef} className="flex justify-center" />
            {error && <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded p-2">{error}</div>}
          </>
        ) : (
          <div className="text-sm text-ink-2 space-y-3">
            <p>This RDM instance is running in <span className="font-semibold">dev auth mode</span> — every request is the local dev user.</p>
            <p className="text-ink-3">To enable Google sign-in for the team, set <code className="bg-canvas border border-hairline px-1 rounded text-[12px]">GOOGLE_CLIENT_ID</code> and <code className="bg-canvas border border-hairline px-1 rounded text-[12px]">AUTH_ALLOWLIST</code> (comma-separated emails) in the server env, then restart.</p>
            <a href="/pipeline" className="inline-block mt-2 px-4 py-2 bg-accent text-white text-sm rounded hover:bg-accent-hover">Continue to pipeline</a>
          </div>
        )}
      </div>
    </div>
  );
}
