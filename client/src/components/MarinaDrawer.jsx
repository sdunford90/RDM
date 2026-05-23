import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMarina, updateMarina, saveAsset } from '../utils/api';
import StagePill from './StagePill';
import ScoreBar from './ScoreBar';
import EnrichmentPanel from './EnrichmentPanel';
import { formatCompactCurrency, formatRelativeTime } from '../utils/formatters';
import { ENRICHABLE_STAGES } from '../utils/stages';

export default function MarinaDrawer({ marinaId, onClose, onChanged, mapboxToken }) {
  const [marina, setMarina] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const navigate = useNavigate();

  const load = useCallback(async () => {
    if (!marinaId) return;
    setLoading(true);
    try {
      const m = await fetchMarina(marinaId);
      setMarina(m);
      setNotesDraft(m.notes || '');
    } finally { setLoading(false); }
  }, [marinaId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function changeStage(stage) {
    const fresh = await updateMarina(marina.id, { stage });
    setMarina(m => ({ ...m, ...fresh }));
    onChanged?.();
  }

  async function saveNotes() {
    setSavingNote(true);
    try {
      const fresh = await updateMarina(marina.id, { notes: notesDraft });
      setMarina(m => ({ ...m, ...fresh, notes: notesDraft }));
      onChanged?.();
    } finally { setSavingNote(false); }
  }

  async function openInUnderwriting() {
    const asset = await saveAsset({
      marinaId: marina.id,
      label: marina.name,
      address: marina.address,
      lat: marina.lat,
      lng: marina.lon
    });
    navigate(`/asset/${asset.id}`);
  }

  return (
    <div className="fixed inset-0 z-40 flex" onClick={onClose}>
      <div className="flex-1 bg-ink-1/30 backdrop-blur-[1px]" />
      <div
        className="w-full max-w-2xl bg-surface shadow-pop flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {loading || !marina ? (
          <div className="p-8 text-ink-3">Loading…</div>
        ) : (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b border-hairline flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-xl font-semibold text-ink-1 truncate">{marina.name}</h2>
                  <StagePill stage={marina.stage} onChange={changeStage} size="lg" />
                </div>
                <div className="text-sm text-ink-3 truncate">{marina.address || `${marina.city || ''} ${marina.state || ''}`.trim()}</div>
                {marina.harbor && <div className="text-xs text-ink-4 mt-0.5">Harbor: {marina.harbor}</div>}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-ink-3">Fit Score</div>
                  <div className="mt-1"><ScoreBar value={marina.fit_score} width={120} /></div>
                </div>
                <button onClick={onClose} className="text-ink-3 hover:text-ink-1 text-2xl leading-none px-2">×</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Score breakdown chips */}
              {marina.fit_score_breakdown && (
                <div className="px-6 pt-4 flex flex-wrap gap-1.5">
                  {Object.entries(marina.fit_score_breakdown)
                    .filter(([, v]) => v && v !== 0)
                    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                    .map(([k, v]) => (
                      <span key={k} className="text-[11px] px-2 py-0.5 rounded-full border border-hairline bg-canvas text-ink-2">
                        {k.replace(/_/g, ' ')} <span className={`font-mono tnum ml-1 ${v >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{v >= 0 ? '+' : ''}{v}</span>
                      </span>
                    ))}
                </div>
              )}

              {/* Map */}
              {marina.lat && marina.lon && mapboxToken && (
                <div className="px-6 mt-4">
                  <img
                    className="w-full h-44 object-cover rounded-lg border border-hairline"
                    alt="Location map"
                    src={`https://api.mapbox.com/styles/v1/mapbox/light-v11/static/pin-s-marker+0E7490(${marina.lon},${marina.lat})/${marina.lon},${marina.lat},13,0/640x300@2x?access_token=${mapboxToken}`}
                  />
                </div>
              )}

              {/* Stat grid */}
              <div className="px-6 mt-4 grid grid-cols-3 gap-3">
                <Stat label="Slips" value={marina.slips} />
                <Stat label="Moorings" value={marina.moorings} />
                <Stat label="Linear ft" value={marina.linear_ft} />
                <Stat label="Max LOA" value={marina.max_loa ? `${marina.max_loa} ft` : null} />
                <Stat label="Approach depth" value={marina.approach_depth ? `${marina.approach_depth} ft` : null} />
                <Stat label="Dock depth" value={marina.dock_depth ? `${marina.dock_depth} ft` : null} />
                <Stat label="Fuel" value={marina.has_fuel_dock ? `${marina.diesel ? 'Diesel ' : ''}${marina.gas ? 'Gas' : ''}`.trim() || 'Yes' : 'No'} />
                <Stat label="Operator" value={marina.operator_type || 'Private'} />
                <Stat label="Amenities" value={marina.amenity_count ? `${marina.amenity_count}` : '—'} />
              </div>

              {/* Hotel market */}
              {marina.hotel_market && (
                <div className="px-6 mt-5">
                  <SectionTitle>Hotel Market <span className="text-ink-4 font-normal text-xs ml-2">({marina.hotel_market.market_name || '—'})</span></SectionTitle>
                  <div className="grid grid-cols-4 gap-3 mt-2">
                    <Stat label="ADR" value={formatCompactCurrency(marina.hotel_market.adr)} />
                    <Stat label="Occupancy" value={marina.hotel_market.occupancy ? `${Math.round(marina.hotel_market.occupancy * 100)}%` : null} />
                    <Stat label="RevPAR" value={formatCompactCurrency(marina.hotel_market.revpar)} />
                    <Stat label="Tier" value={marina.hotel_market.tier_label || marina.hotel_market.tier} />
                  </div>
                  {marina.hotel_market.source && (
                    <div className="text-[11px] text-ink-4 mt-2">Source: {marina.hotel_market.source}</div>
                  )}
                </div>
              )}

              {/* About */}
              {marina.about && (
                <div className="px-6 mt-5">
                  <SectionTitle>About</SectionTitle>
                  <p className="mt-1 text-sm text-ink-2 leading-relaxed">{marina.about}</p>
                </div>
              )}

              {/* Contact */}
              {(marina.phone || marina.website || marina.source_url) && (
                <div className="px-6 mt-5">
                  <SectionTitle>Links</SectionTitle>
                  <div className="mt-1 space-y-1 text-sm">
                    {marina.phone && <div className="text-ink-2">📞 {marina.phone}</div>}
                    {marina.website && <a href={`https://${marina.website.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer" className="block text-accent hover:underline truncate">🌐 {marina.website}</a>}
                    {marina.source_url && <a href={marina.source_url} target="_blank" rel="noreferrer" className="block text-accent hover:underline truncate">📍 marinas.com listing</a>}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="px-6 mt-5">
                <SectionTitle>Notes</SectionTitle>
                <textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder="Notes for the team…"
                  className="mt-1 w-full h-24 p-2 text-sm bg-canvas border border-hairline rounded focus:bg-surface focus:border-accent"
                />
                <div className="flex justify-end mt-1">
                  <button
                    onClick={saveNotes}
                    disabled={savingNote || notesDraft === (marina.notes || '')}
                    className="px-3 py-1 text-xs border border-hairline rounded text-ink-2 hover:bg-muted disabled:opacity-40"
                  >{savingNote ? 'Saving…' : 'Save notes'}</button>
                </div>
              </div>

              {/* Enrichment */}
              <div className="px-6 mt-5">
                <EnrichmentPanel marina={marina} onUpdated={load} />
                {ENRICHABLE_STAGES.has(marina.stage) && marina.enrichment_status === 'complete' && (
                  <div className="mt-3 flex justify-end">
                    <button onClick={openInUnderwriting} className="px-4 py-2 text-sm bg-ink-1 text-white rounded hover:bg-ink-2">Open in Underwriting →</button>
                  </div>
                )}
              </div>

              {/* Activity */}
              {marina.activity && marina.activity.length > 0 && (
                <div className="px-6 mt-6 mb-6">
                  <SectionTitle>Activity</SectionTitle>
                  <ul className="mt-2 space-y-1.5">
                    {marina.activity.map(a => (
                      <li key={a.id} className="flex items-center gap-2 text-xs text-ink-3">
                        <span className="font-medium text-ink-2">{a.user_name || a.user_email || 'system'}</span>
                        <span>{prettyAction(a)}</span>
                        <span className="ml-auto">{formatRelativeTime(a.at)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-canvas border border-hairline rounded p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-ink-3">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-ink-1 tnum">{value ?? '—'}</div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h3 className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold">{children}</h3>;
}

function prettyAction(a) {
  const p = (() => { try { return JSON.parse(a.payload || '{}'); } catch { return {}; } })();
  if (a.action === 'stage_change')   return `moved ${p.from || ''} → ${p.to || ''}`;
  if (a.action === 'note')           return 'updated notes';
  if (a.action === 'enrich')         return `ran enrichment (${(p.sources || []).map(s => s.source).join(', ')})`;
  if (a.action === 'underwrite_open') return 'opened in underwriting';
  return a.action;
}
