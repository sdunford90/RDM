import React from 'react';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-fuchsia-50 to-white flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight">RDM Deal Tool</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Real Estate Deal<br />Intelligence Platform
          </h1>
          <p className="text-violet-200 text-lg leading-relaxed max-w-sm">
            Analyze marina and hospitality assets with live parcel data, STR market comps, and underwriting tools — all in one place.
          </p>
        </div>
        <div className="relative z-10 space-y-4">
          {[
            { icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7', label: 'Parcel data with adjacent lot analysis' },
            { icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', label: 'Live STR market metrics and revenue estimates' },
            { icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z', label: 'Full underwriting model with cap rate analysis' },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-3 text-violet-100">
              <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                </svg>
              </div>
              <span className="text-sm">{label}</span>
            </div>
          ))}
        </div>
        <p className="relative z-10 text-violet-300 text-xs">© {new Date().getFullYear()} RDM Deal Tool · Private access only</p>
      </div>

      {/* Right sign-in panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 justify-center">
            <div className="w-10 h-10 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-glow-violet">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-lg font-bold gradient-text">RDM Deal Tool</span>
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-text-primary">Welcome back</h2>
            <p className="text-text-tertiary text-sm">Sign in with your Replit account to access the platform. Access is invitation-only.</p>
          </div>

          <a href="/api/login"
            className="flex items-center justify-center gap-3 w-full px-6 py-3.5 bg-white border border-border rounded-2xl text-sm font-semibold text-text-primary hover:bg-surface-2 hover:border-border-hover shadow-soft hover:shadow-card transition-all group">
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#F26207"/>
              <path d="M8 9h8M8 12h5M8 15h3" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Continue with Replit
            <svg className="w-4 h-4 text-text-tertiary group-hover:text-text-secondary transition-colors ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <p className="text-center text-[10px] text-text-tertiary">You'll be redirected to Replit to authenticate</p>

          <p className="text-center text-xs text-text-tertiary leading-relaxed">
            Don't have access?<br />
            Ask a team member to invite your email address.
          </p>
        </div>
      </div>
    </div>
  );
}
