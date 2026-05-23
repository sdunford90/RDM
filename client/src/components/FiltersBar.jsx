import React, { useState } from 'react';
import { STAGES } from '../utils/stages';
import { useIsNarrow } from '../hooks/useMediaQuery';

const US_STATES = ['FL','NY','NJ','MD','MA','ME','CT','VA','NC','SC','GA','NH','DE','TN'];

export default function FiltersBar({ filters, onChange, onReset, total }) {
  const narrow = useIsNarrow();
  const [sheetOpen, setSheetOpen] = useState(false);

  const activeCount = countActive(filters);

  // Mobile: search + filters-button row, plus a bottom-sheet drawer for the rest.
  if (narrow) {
    return (
      <>
        <div className="flex items-center gap-2 px-3 py-2 bg-surface border-b border-hairline">
          <div className="relative flex-1">
            <input
              type="search"
              placeholder="Search marinas, cities…"
              value={filters.q}
              onChange={(e) => onChange({ q: e.target.value })}
              className="w-full pl-8 pr-3 py-2 text-sm bg-canvas border border-hairline rounded focus:border-accent focus:bg-surface"
            />
            <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-ink-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M11 19a8 8 0 110-16 8 8 0 010 16z" /></svg>
          </div>
          <button
            onClick={() => setSheetOpen(true)}
            className="relative px-3 py-2 text-sm border border-hairline rounded bg-canvas text-ink-2 flex items-center gap-1.5"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M6 12h12M10 20h4" /></svg>
            Filters
            {activeCount > 0 && (
              <span className="ml-0.5 inline-grid place-items-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold bg-accent text-white rounded-full">{activeCount}</span>
            )}
          </button>
        </div>
        <div className="px-3 py-1.5 bg-canvas border-b border-hairline text-[11px] text-ink-3 tnum flex items-center justify-between">
          <span>{total.toLocaleString()} marinas</span>
          {activeCount > 0 && <button onClick={onReset} className="text-ink-3 hover:text-accent">Reset filters</button>}
        </div>
        {sheetOpen && (
          <FilterSheet
            filters={filters}
            onChange={onChange}
            onReset={onReset}
            total={total}
            onClose={() => setSheetOpen(false)}
          />
        )}
      </>
    );
  }

  // Desktop: original inline layout.
  return (
    <div className="flex flex-wrap items-center gap-2 px-5 py-3 bg-surface border-b border-hairline">
      <div className="relative">
        <input
          type="search"
          placeholder="Search marinas, cities, harbors…"
          value={filters.q}
          onChange={(e) => onChange({ q: e.target.value })}
          className="w-72 pl-8 pr-3 py-1.5 text-sm bg-canvas border border-hairline rounded focus:border-accent focus:bg-surface"
        />
        <svg className="absolute left-2.5 top-2 w-4 h-4 text-ink-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M11 19a8 8 0 110-16 8 8 0 010 16z" /></svg>
      </div>

      <Select value={filters.state} onChange={v => onChange({ state: v })} placeholder="All states" options={US_STATES} />
      <Select value={filters.stage} onChange={v => onChange({ stage: v })} placeholder="All stages" options={STAGES.map(s => ({ value: s.id, label: s.label }))} />
      <PrivateOnlyToggle value={filters.operator_type} onChange={v => onChange({ operator_type: v })} />

      <NumInput value={filters.min_slips} onChange={v => onChange({ min_slips: v })} placeholder="Min slips" width={96} />
      <NumInput value={filters.min_depth} onChange={v => onChange({ min_depth: v })} placeholder="Min depth (ft)" width={120} />

      <div className="flex items-center gap-2 ml-1">
        <label className="text-xs uppercase tracking-wider text-ink-3">Min score</label>
        <input
          type="range" min="0" max="100" step="5"
          value={filters.min_score || 0}
          onChange={(e) => onChange({ min_score: Number(e.target.value) })}
          className="w-28"
        />
        <span className="font-mono tnum text-sm text-ink-2 w-7">{filters.min_score || 0}</span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <span className="text-sm text-ink-3 tnum">{total.toLocaleString()} marinas</span>
        <button onClick={onReset} className="text-sm text-ink-3 hover:text-accent">Reset</button>
      </div>
    </div>
  );
}

function FilterSheet({ filters, onChange, onReset, total, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col" onClick={onClose}>
      <div className="flex-1 bg-ink-1/40" />
      <div
        className="bg-surface rounded-t-xl shadow-pop max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-surface border-b border-hairline px-4 py-3 flex items-center justify-between rounded-t-xl">
          <h3 className="text-sm font-semibold text-ink-1">Filters</h3>
          <button onClick={onClose} className="text-ink-3 hover:text-ink-1 text-2xl leading-none px-2">×</button>
        </div>
        <div className="p-4 space-y-4">
          <Field label="State">
            <Select value={filters.state} onChange={v => onChange({ state: v })} placeholder="All states" options={US_STATES} block />
          </Field>
          <Field label="Stage">
            <Select value={filters.stage} onChange={v => onChange({ stage: v })} placeholder="All stages" options={STAGES.map(s => ({ value: s.id, label: s.label }))} block />
          </Field>
          <Field label="Operator">
            <PrivateOnlyToggle value={filters.operator_type} onChange={v => onChange({ operator_type: v })} block />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Min slips">
              <NumInput value={filters.min_slips} onChange={v => onChange({ min_slips: v })} placeholder="0" block />
            </Field>
            <Field label="Min depth (ft)">
              <NumInput value={filters.min_depth} onChange={v => onChange({ min_depth: v })} placeholder="0" block />
            </Field>
          </div>
          <Field label={`Min fit score: ${filters.min_score || 0}`}>
            <input
              type="range" min="0" max="100" step="5"
              value={filters.min_score || 0}
              onChange={(e) => onChange({ min_score: Number(e.target.value) })}
              className="w-full"
            />
          </Field>
        </div>
        <div className="sticky bottom-0 bg-surface border-t border-hairline px-4 py-3 flex items-center gap-3">
          <button onClick={onReset} className="px-4 py-2.5 text-sm border border-hairline rounded text-ink-2">Reset</button>
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm bg-accent text-white rounded font-medium">
            Show {total.toLocaleString()} marinas
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wider text-ink-3 font-medium mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Select({ value, onChange, placeholder, options, block = false }) {
  const opts = options.map(o => typeof o === 'string' ? { value: o, label: o } : o);
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className={`${block ? 'w-full' : ''} px-2.5 py-2 text-sm bg-canvas border border-hairline rounded focus:border-accent focus:bg-surface text-ink`}
    >
      <option value="">{placeholder}</option>
      {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function PrivateOnlyToggle({ value, onChange, block = false }) {
  const checked = value === 'private_only';
  return (
    <label className={`${block ? 'w-full' : ''} flex items-center gap-1.5 text-sm text-ink-2 px-2.5 py-2 border border-hairline rounded bg-canvas cursor-pointer hover:border-rule`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked ? 'private_only' : '')}
        className="accent-accent"
      />
      Private only
    </label>
  );
}

function NumInput({ value, onChange, placeholder, width = 80, block = false }) {
  return (
    <input
      type="number"
      inputMode="numeric"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={block ? undefined : { width }}
      className={`${block ? 'w-full' : ''} px-2.5 py-2 text-sm bg-canvas border border-hairline rounded focus:border-accent focus:bg-surface tnum`}
    />
  );
}

function countActive(f) {
  let n = 0;
  if (f.state) n++;
  if (f.stage) n++;
  if (f.operator_type) n++;
  if (f.min_slips) n++;
  if (f.min_depth) n++;
  if (f.min_score) n++;
  return n;
}
