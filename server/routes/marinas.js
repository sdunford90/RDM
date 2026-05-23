// Marina pipeline API.
//   GET    /api/marinas              filtered, paginated list
//   GET    /api/marinas/stats        counts by stage + global rollups
//   GET    /api/marinas/:id          full record + enrichments + recent activity
//   PATCH  /api/marinas/:id          { stage?, notes? }
//   POST   /api/marinas/:id/enrich   on-click enrichment (idempotent within freshness window)

const express = require('express');
const { getDB } = require('../sqlite');
const { requireAuth } = require('../middleware/auth');
const { runEnrichment } = require('../enrichment');

const router = express.Router();
router.use(requireAuth);

const STAGES = ['new', 'watchlist', 'qualified', 'researching', 'outreach', 'in_dialogue', 'loi_submitted', 'under_loi', 'diligence', 'closed', 'passed', 'dead'];
const ENRICHABLE = new Set(['qualified', 'researching', 'outreach', 'in_dialogue', 'loi_submitted', 'under_loi', 'diligence', 'closed']);
const SORTABLE = new Set(['fit_score', 'name', 'state', 'slips', 'last_activity_at', 'stage', 'stage_changed_at']);

function parseJSON(v) {
  if (!v) return null;
  try { return JSON.parse(v); } catch { return null; }
}

function shapeRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    city: r.city,
    state: r.state,
    region: r.region,
    address: r.address,
    lat: r.lat,
    lon: r.lon,
    operator_type: r.operator_type,
    is_public: !!r.is_public,
    slips: r.slips,
    moorings: r.moorings,
    linear_ft: r.linear_ft,
    max_loa: r.max_loa,
    has_fuel_dock: !!r.has_fuel_dock,
    amenity_count: r.amenity_count,
    hotel_market: parseJSON(r.hotel_market),
    fit_score: r.fit_score,
    stage: r.stage,
    stage_changed_at: r.stage_changed_at,
    stage_changed_by: r.stage_changed_by,
    enrichment_status: r.enrichment_status,
    enriched_at: r.enriched_at,
    last_activity_at: r.last_activity_at,
    reviewer_email: r.reviewer_email || null,
    reviewer_name: r.reviewer_name || null
  };
}

// GET /api/marinas/stats — pipeline-wide rollups (used for header strip + Kanban counts).
router.get('/stats', (req, res) => {
  const db = getDB();
  const stages = db.prepare(`
    SELECT stage, COUNT(*) AS count, COALESCE(SUM(slips), 0) AS total_slips
    FROM marinas
    GROUP BY stage
  `).all();
  const totals = db.prepare(`
    SELECT COUNT(*) AS total,
           SUM(CASE WHEN stage <> 'new' THEN 1 ELSE 0 END) AS reviewed,
           SUM(CASE WHEN stage IN ('qualified','researching','outreach','in_dialogue','loi_submitted','under_loi','diligence','closed') THEN 1 ELSE 0 END) AS interested
    FROM marinas
  `).get();
  res.json({ stages, totals });
});

// GET /api/marinas — filtered list.
router.get('/', (req, res) => {
  const db = getDB();
  const {
    stage, state, region, operator_type, q,
    min_slips, min_score, min_depth,
    sort = 'fit_score', dir = 'desc',
    limit = '100', offset = '0',
    ids // comma-separated, used by Compare / triage navigation
  } = req.query;

  const where = [];
  const params = {};

  if (ids) {
    const list = String(ids).split(',').map(s => s.trim()).filter(Boolean);
    if (list.length) {
      where.push(`m.id IN (${list.map((_, i) => `@id${i}`).join(',')})`);
      list.forEach((v, i) => { params[`id${i}`] = v; });
    }
  }
  if (stage)         { where.push('m.stage = @stage');                 params.stage = stage; }
  if (state)         { where.push('m.state = @state');                 params.state = state; }
  if (region)        { where.push('m.region = @region');               params.region = region; }
  if (operator_type) { where.push('m.operator_type = @operator_type'); params.operator_type = operator_type; }
  if (min_slips)     { where.push('COALESCE(m.slips, 0) >= @min_slips'); params.min_slips = Number(min_slips); }
  if (min_score)     { where.push('m.fit_score >= @min_score');        params.min_score = Number(min_score); }
  if (min_depth)     { where.push('COALESCE(m.approach_depth, m.dock_depth, 0) >= @min_depth'); params.min_depth = Number(min_depth); }
  if (q) {
    where.push('(m.name LIKE @q OR m.city LIKE @q OR m.address LIKE @q OR m.harbor LIKE @q)');
    params.q = `%${q}%`;
  }

  const sortKey = SORTABLE.has(sort) ? sort : 'fit_score';
  const sortDir = (dir + '').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const lim = Math.min(500, Math.max(1, parseInt(limit, 10) || 100));
  const off = Math.max(0, parseInt(offset, 10) || 0);

  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const total = db.prepare(`SELECT COUNT(*) AS c FROM marinas m ${whereSql}`).get(params).c;
  const rows = db.prepare(`
    SELECT m.*, u.email AS reviewer_email, u.name AS reviewer_name
    FROM marinas m
    LEFT JOIN users u ON u.id = m.stage_changed_by
    ${whereSql}
    ORDER BY m.${sortKey} ${sortDir}, m.id ASC
    LIMIT @__lim OFFSET @__off
  `).all({ ...params, __lim: lim, __off: off });

  res.json({ total, limit: lim, offset: off, results: rows.map(shapeRow) });
});

// GET /api/marinas/:id — full detail.
router.get('/:id', (req, res) => {
  const db = getDB();
  const row = db.prepare(`
    SELECT m.*, u.email AS reviewer_email, u.name AS reviewer_name
    FROM marinas m
    LEFT JOIN users u ON u.id = m.stage_changed_by
    WHERE m.id = ?
  `).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Marina not found' });

  const enrichments = db.prepare('SELECT * FROM enrichments WHERE marina_id = ?').all(req.params.id);
  const activity = db.prepare(`
    SELECT a.*, u.email AS user_email, u.name AS user_name
    FROM activity_log a
    LEFT JOIN users u ON u.id = a.user_id
    WHERE a.marina_id = ?
    ORDER BY a.at DESC
    LIMIT 20
  `).all(req.params.id);

  res.json({
    ...shapeRow(row),
    amenities: parseJSON(row.amenities),
    dockage_rates: parseJSON(row.dockage_rates),
    fit_score_breakdown: parseJSON(row.fit_score_breakdown),
    notes: row.notes || '',
    about: row.about,
    phone: row.phone,
    vhf: row.vhf,
    website: row.website,
    harbor: row.harbor,
    approach_depth: row.approach_depth,
    dock_depth: row.dock_depth,
    max_slip_length: row.max_slip_length,
    max_slip_width: row.max_slip_width,
    source_url: row.source_url,
    scraped_at: row.scraped_at,
    enrichments: enrichments.map(e => ({
      source: e.source,
      data: parseJSON(e.data),
      fetched_at: e.fetched_at,
      status: e.status,
      error_message: e.error_message,
      cost_estimate_cents: e.cost_estimate_cents
    })),
    activity
  });
});

// PATCH /api/marinas/:id — change stage and/or notes.
router.patch('/:id', (req, res) => {
  const db = getDB();
  const { stage, notes } = req.body || {};
  const existing = db.prepare('SELECT id, stage, notes FROM marinas WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Marina not found' });

  const sets = [];
  const params = { id: req.params.id, user: req.user.id };
  const now = new Date().toISOString();

  if (typeof stage === 'string') {
    if (!STAGES.includes(stage)) return res.status(400).json({ error: 'Invalid stage' });
    sets.push('stage = @stage', 'stage_changed_at = @ts', 'stage_changed_by = @user');
    params.stage = stage;
    params.ts = now;
  }
  if (typeof notes === 'string') {
    sets.push('notes = @notes');
    params.notes = notes;
  }

  if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });

  sets.push('last_activity_at = @ts2', 'updated_at = @ts2');
  params.ts2 = now;

  db.prepare(`UPDATE marinas SET ${sets.join(', ')} WHERE id = @id`).run(params);

  if (typeof stage === 'string' && stage !== existing.stage) {
    db.prepare(`INSERT INTO activity_log (marina_id, user_id, action, payload) VALUES (?, ?, 'stage_change', ?)`)
      .run(req.params.id, req.user.id, JSON.stringify({ from: existing.stage, to: stage }));
  }
  if (typeof notes === 'string' && notes !== (existing.notes || '')) {
    db.prepare(`INSERT INTO activity_log (marina_id, user_id, action, payload) VALUES (?, ?, 'note', ?)`)
      .run(req.params.id, req.user.id, JSON.stringify({ length: notes.length }));
  }

  const fresh = db.prepare(`
    SELECT m.*, u.email AS reviewer_email, u.name AS reviewer_name
    FROM marinas m
    LEFT JOIN users u ON u.id = m.stage_changed_by
    WHERE m.id = ?
  `).get(req.params.id);
  res.json(shapeRow(fresh));
});

// POST /api/marinas/:id/enrich — fan out to all paid APIs, persist responses, return aggregate.
router.post('/:id/enrich', async (req, res) => {
  const db = getDB();
  const force = req.query.force === '1' || req.body?.force === true;
  const marina = db.prepare('SELECT * FROM marinas WHERE id = ?').get(req.params.id);
  if (!marina) return res.status(404).json({ error: 'Marina not found' });

  if (!ENRICHABLE.has(marina.stage)) {
    return res.status(400).json({ error: `Move this marina to Qualified or further before enriching (current stage: ${marina.stage})` });
  }

  db.prepare(`UPDATE marinas SET enrichment_status = 'running', updated_at = datetime('now') WHERE id = ?`).run(req.params.id);
  try {
    const result = await runEnrichment(marina, { force });
    const ok = !result.results.some(r => r.status === 'error');
    db.prepare(`
      UPDATE marinas
      SET enrichment_status = ?, enriched_at = datetime('now'), last_activity_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).run(ok ? 'complete' : 'failed', req.params.id);
    db.prepare(`INSERT INTO activity_log (marina_id, user_id, action, payload) VALUES (?, ?, 'enrich', ?)`)
      .run(req.params.id, req.user.id, JSON.stringify({ sources: result.results.map(r => ({ source: r.source, status: r.status, cached: r.cached })) }));
    res.json(result);
  } catch (e) {
    console.error('Enrichment failed:', e);
    db.prepare(`UPDATE marinas SET enrichment_status = 'failed', updated_at = datetime('now') WHERE id = ?`).run(req.params.id);
    res.status(500).json({ error: 'Enrichment failed', detail: e.message });
  }
});

module.exports = router;
