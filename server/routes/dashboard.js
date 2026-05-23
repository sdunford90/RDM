// Aggregator endpoint for the home dashboard.
// One query per panel — all small, all read-only.

const express = require('express');
const { getDB } = require('../sqlite');
const { STAGES_BY_ID, ENRICHABLE_STAGES, ACTIVE_STAGES, STUCK_THRESHOLD_DAYS } = require('../stage-config');

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDB();
  const userId = req.user?.id || null;

  // Funnel: counts per stage now + counts 7 days ago, for delta arrows.
  const funnelNow = db.prepare(`
    SELECT stage, COUNT(*) AS count, COALESCE(SUM(slips), 0) AS total_slips
    FROM marinas GROUP BY stage
  `).all();

  // "7 days ago" snapshot derived from activity_log: count marinas whose stage *changed* recently
  // and reconstruct prior totals. Cheap approximation — exact enough for week-over-week.
  const recentMoves = db.prepare(`
    SELECT marina_id, action, payload
    FROM activity_log
    WHERE action = 'stage_change' AND at > datetime('now', '-7 days')
  `).all();

  const movedIn = {};   // stage → count of marinas that moved INTO this stage this week
  const movedOut = {};  // stage → count of marinas that moved OUT of this stage this week
  for (const m of recentMoves) {
    try {
      const p = JSON.parse(m.payload || '{}');
      if (p.to)   movedIn[p.to]    = (movedIn[p.to]    || 0) + 1;
      if (p.from) movedOut[p.from] = (movedOut[p.from] || 0) + 1;
    } catch { /* ignore */ }
  }

  const funnel = funnelNow.map(s => ({
    stage: s.stage,
    count: s.count,
    total_slips: s.total_slips,
    in_this_week: movedIn[s.stage] || 0,
    out_this_week: movedOut[s.stage] || 0
  }));

  // Stuck: in an active stage longer than N days without activity.
  const stuckRows = db.prepare(`
    SELECT id, name, city, state, stage, fit_score, stage_changed_at, last_activity_at
    FROM marinas
    WHERE stage IN (${ACTIVE_STAGES.map(() => '?').join(',')})
      AND COALESCE(last_activity_at, stage_changed_at, created_at) < datetime('now', ?)
    ORDER BY COALESCE(last_activity_at, stage_changed_at, created_at) ASC
    LIMIT 8
  `).all(...ACTIVE_STAGES, `-${STUCK_THRESHOLD_DAYS} days`);

  // Top of funnel: highest fit score still in 'new'.
  const topUnreviewed = db.prepare(`
    SELECT id, name, city, state, slips, fit_score
    FROM marinas
    WHERE stage = 'new'
    ORDER BY fit_score DESC
    LIMIT 8
  `).all();

  // My active: marinas I last touched, in an active stage.
  let myActive = [];
  if (userId) {
    myActive = db.prepare(`
      SELECT m.id, m.name, m.city, m.state, m.stage, m.fit_score, m.last_activity_at
      FROM marinas m
      WHERE m.stage_changed_by = ?
        AND m.stage IN (${ACTIVE_STAGES.map(() => '?').join(',')})
      ORDER BY COALESCE(m.last_activity_at, m.stage_changed_at) DESC
      LIMIT 8
    `).all(userId, ...ACTIVE_STAGES);
  }

  // Recent team activity
  const recentActivity = db.prepare(`
    SELECT a.id, a.marina_id, a.action, a.payload, a.at,
           m.name AS marina_name,
           u.email AS user_email, u.name AS user_name
    FROM activity_log a
    LEFT JOIN marinas m ON m.id = a.marina_id
    LEFT JOIN users u ON u.id = a.user_id
    WHERE a.marina_id IS NOT NULL
    ORDER BY a.at DESC
    LIMIT 12
  `).all();

  // Headline counters
  const totals = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN stage = 'new' THEN 1 ELSE 0 END) AS unreviewed,
      SUM(CASE WHEN stage IN (${ACTIVE_STAGES.map(() => '?').join(',')}) THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN stage = 'closed' THEN 1 ELSE 0 END) AS closed
    FROM marinas
  `).get(...ACTIVE_STAGES);

  res.json({
    totals,
    funnel,
    stuck: stuckRows,
    top_unreviewed: topUnreviewed,
    my_active: myActive,
    recent_activity: recentActivity
  });
});

module.exports = router;
