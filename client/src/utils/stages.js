// Canonical pipeline stage list, labels, and color tokens.
// Order = funnel left-to-right; passed sits at the far right as a "closed lost" bucket.

export const STAGES = [
  { id: 'new',            label: 'New',            color: '#94A3B8', tint: '#F1F3F7' },
  { id: 'reviewing',      label: 'Reviewing',      color: '#0EA5E9', tint: '#E0F2FE' },
  { id: 'interested',     label: 'Interested',     color: '#F59E0B', tint: '#FEF3C7' },
  { id: 'researching',    label: 'Researching',    color: '#8B5CF6', tint: '#EDE9FE' },
  { id: 'loi',            label: 'LOI',            color: '#6366F1', tint: '#E0E7FF' },
  { id: 'under_contract', label: 'Under Contract', color: '#10B981', tint: '#D1FAE5' },
  { id: 'closed',         label: 'Closed',         color: '#0E7490', tint: '#CFFAFE' },
  { id: 'passed',         label: 'Passed',         color: '#94A3B8', tint: '#F1F3F7' }
];

export const STAGES_BY_ID = Object.fromEntries(STAGES.map(s => [s.id, s]));

// Stages that allow enrichment (Interested or further into the funnel, excluding passed).
export const ENRICHABLE_STAGES = new Set(['interested', 'researching', 'loi', 'under_contract', 'closed']);

// Triage-quick actions and their target stage.
export const TRIAGE_ACTIONS = [
  { key: 'i', label: 'Interested', stage: 'interested', accent: '#F59E0B' },
  { key: 'm', label: 'Maybe',      stage: 'reviewing',  accent: '#0EA5E9' },
  { key: 'p', label: 'Pass',       stage: 'passed',     accent: '#94A3B8' }
];
