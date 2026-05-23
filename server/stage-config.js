// Single source of truth for which stages count as "active" pipeline work.
// Used by the dashboard, the pipeline stats query, and the enrichment gate.

const STAGES_BY_ID = {
  new:           { label: 'New' },
  watchlist:     { label: 'Watchlist' },
  qualified:     { label: 'Qualified' },
  researching:   { label: 'Researching' },
  outreach:      { label: 'Outreach' },
  in_dialogue:   { label: 'In Dialogue' },
  loi_submitted: { label: 'LOI Submitted' },
  under_loi:     { label: 'Under LOI' },
  diligence:     { label: 'Diligence' },
  closed:        { label: 'Closed' },
  passed:        { label: 'Passed' },
  dead:          { label: 'Dead' }
};

const ACTIVE_STAGES = [
  'qualified', 'researching', 'outreach', 'in_dialogue',
  'loi_submitted', 'under_loi', 'diligence'
];

const ENRICHABLE_STAGES = new Set([
  ...ACTIVE_STAGES, 'closed'
]);

const STUCK_THRESHOLD_DAYS = 14;

module.exports = { STAGES_BY_ID, ACTIVE_STAGES, ENRICHABLE_STAGES, STUCK_THRESHOLD_DAYS };
