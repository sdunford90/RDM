// Canonical pipeline stage list, labels, and color tokens.
//
// Order = funnel left-to-right across the Kanban. The first column is
// where everything lands at import; "Passed" and "Dead" sit at the
// far right as closed-lost buckets.

export const STAGES = [
  { id: 'new',           label: 'New',           color: '#94A3B8', tint: '#F1F3F7' },
  { id: 'watchlist',     label: 'Watchlist',     color: '#0EA5E9', tint: '#E0F2FE' },
  { id: 'qualified',     label: 'Qualified',     color: '#F59E0B', tint: '#FEF3C7' },
  { id: 'researching',   label: 'Researching',   color: '#8B5CF6', tint: '#EDE9FE' },
  { id: 'outreach',      label: 'Outreach',      color: '#EC4899', tint: '#FCE7F3' },
  { id: 'in_dialogue',   label: 'In Dialogue',   color: '#D946EF', tint: '#FAE8FF' },
  { id: 'loi_submitted', label: 'LOI Submitted', color: '#6366F1', tint: '#E0E7FF' },
  { id: 'under_loi',     label: 'Under LOI',     color: '#4F46E5', tint: '#E0E7FF' },
  { id: 'diligence',     label: 'Diligence',     color: '#0E7490', tint: '#CFFAFE' },
  { id: 'closed',        label: 'Closed',        color: '#10B981', tint: '#D1FAE5' },
  { id: 'passed',        label: 'Passed',        color: '#94A3B8', tint: '#F1F3F7' },
  { id: 'dead',          label: 'Dead',          color: '#64748B', tint: '#E2E8F0' }
];

export const STAGES_BY_ID = Object.fromEntries(STAGES.map(s => [s.id, s]));

// Stages where paid enrichment is unlocked. Anything past initial triage
// where we're seriously evaluating the deal — but not the closed-lost buckets.
export const ENRICHABLE_STAGES = new Set([
  'qualified', 'researching', 'outreach', 'in_dialogue',
  'loi_submitted', 'under_loi', 'diligence', 'closed'
]);

// Triage Mode keyboard shortcuts. Only the three most common actions —
// the rest of the pipeline progresses via the drawer or the Kanban.
export const TRIAGE_ACTIONS = [
  { key: 'q', label: 'Qualified', stage: 'qualified', accent: '#F59E0B' },
  { key: 'w', label: 'Watchlist', stage: 'watchlist', accent: '#0EA5E9' },
  { key: 'p', label: 'Pass',      stage: 'passed',    accent: '#94A3B8' }
];
