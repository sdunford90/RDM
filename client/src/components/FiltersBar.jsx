import React from 'react';
import { STAGES } from '../utils/stages';

const US_STATES = ['FL','NY','NJ','MD','MA','ME','CT','VA','NC','SC','GA','NH','DE','TN'];
const OPERATOR_TYPES = ['Town', 'Municipal', 'Public', 'State', 'Harbormaster', 'Gov (description)', 'County'];

export default function FiltersBar({ filters, onChange, onReset, total }) {
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
      <NegativeSelect
        value={filters.operator_type}
        onChange={v => onChange({ operator_type: v })}
        placeholder="Private only"
        options={OPERATOR_TYPES}
      />

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
        <button
          onClick={onReset}
          className="text-sm text-ink-3 hover:text-accent"
        >Reset</button>
      </div>
    </div>
  );
}

function Select({ value, onChange, placeholder, options }) {
  const opts = options.map(o => typeof o === 'string' ? { value: o, label: o } : o);
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="px-2.5 py-1.5 text-sm bg-canvas border border-hairline rounded focus:border-accent focus:bg-surface text-ink"
    >
      <option value="">{placeholder}</option>
      {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// Same UI as Select but the value means "exclude this operator_type" — useful for "private only".
// We don't actually have a private-only flag server-side, so we instead expose the public types as exclusions.
// For the MVP we use a simpler approach: a "Private only" checkbox.
function NegativeSelect({ value, onChange }) {
  // value === 'private_only' means we filter operator_type IS NULL.
  // The server doesn't support a negative match yet; for now show a simple Private-only toggle.
  const checked = value === 'private_only';
  return (
    <label className="flex items-center gap-1.5 text-sm text-ink-2 px-2.5 py-1.5 border border-hairline rounded bg-canvas cursor-pointer hover:border-rule">
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

function NumInput({ value, onChange, placeholder, width = 80 }) {
  return (
    <input
      type="number"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width }}
      className="px-2.5 py-1.5 text-sm bg-canvas border border-hairline rounded focus:border-accent focus:bg-surface tnum"
    />
  );
}
