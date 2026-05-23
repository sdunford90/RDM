// Orchestrates on-click enrichment: Regrid + AirROI + AirDNA + valuation.
// Each source is independent — failures are isolated, results cached per (marina, source).

const fetch = require('node-fetch');
const { getDB } = require('./sqlite');

const FRESHNESS_DAYS = 30;

const SOURCES = ['regrid', 'airroi', 'airdna', 'valuation'];

// Rough per-call cost estimates in cents. Used only for UI display.
const COST_CENTS = {
  regrid: 5,
  airroi: 5,
  airdna: 30,
  valuation: 15
};

function isFresh(fetched_at) {
  if (!fetched_at) return false;
  const age = Date.now() - new Date(fetched_at).getTime();
  return age < FRESHNESS_DAYS * 24 * 3600 * 1000;
}

async function callRegrid(m) {
  const token = process.env.REGRID_API_KEY;
  if (!token) return { status: 'skipped', error: 'REGRID_API_KEY not set' };
  if (m.lat == null || m.lon == null) return { status: 'error', error: 'Missing lat/lon' };
  const url = `https://app.regrid.com/api/v2/parcels/point?lat=${m.lat}&lon=${m.lon}&token=${token}&returnGeo=true`;
  const r = await fetch(url);
  const j = await r.json();
  const feat = (j.results && j.results[0]) || (j.features && j.features[0]);
  if (!feat) return { status: 'ok', data: { error: 'No parcel match', raw: j } };
  const p = feat.properties || {};
  return {
    status: 'ok',
    data: {
      owner: p.owner || p.mail_name || null,
      apn: p.parcelnumb || p.apn || null,
      acreage: p.ll_gisacre || p.gisacre || p.acreage || null,
      assessed_value: p.assdtotval || p.totval || null,
      land_value: p.assdlandval || p.landval || null,
      improvement_value: p.assdimpval || p.impval || null,
      zoning: p.zoning || p.zoning_description || null,
      county: p.county || null,
      last_sale_date: p.saledate || null,
      last_sale_price: p.saleprice || null,
      flood_zone: p.fema_flood_zone || null,
      geometry: feat.geometry || null,
      raw: p
    }
  };
}

async function callAirROI(m) {
  const apiKey = process.env.AIRROI_API_KEY;
  if (!apiKey) return { status: 'skipped', error: 'AIRROI_API_KEY not set' };
  if (m.lat == null || m.lon == null) return { status: 'error', error: 'Missing lat/lon' };
  const url = `https://api.airroi.com/v1/market?lat=${m.lat}&lng=${m.lon}&radius=10`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!r.ok) return { status: 'ok', data: { error: `AirROI returned ${r.status}` } };
  const j = await r.json();
  return {
    status: 'ok',
    data: {
      avg_daily_rate: j.avg_daily_rate || j.adr || null,
      avg_occupancy: j.avg_occupancy || j.occupancy_rate || null,
      avg_monthly_revenue: j.avg_monthly_revenue || j.monthly_revenue || null,
      active_listings: j.active_listings || j.listing_count || null,
      market_score: j.market_score || null,
      monthly_data: j.monthly_data || j.seasonal_data || null,
      raw: j
    }
  };
}

async function callAirDNA(m) {
  const apiKey = process.env.AIRDNA_API_KEY;
  if (!apiKey) return { status: 'skipped', error: 'AIRDNA_API_KEY not set' };
  if (m.lat == null || m.lon == null) return { status: 'error', error: 'Missing lat/lon' };
  const url = `https://api.airdna.co/v1/market/rentalizer?lat=${m.lat}&lng=${m.lon}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!r.ok) return { status: 'ok', data: { error: `AirDNA returned ${r.status}` } };
  const j = await r.json();
  return { status: 'ok', data: j };
}

async function callValuation(m) {
  const adapter = process.env.VALUATION_PROVIDER;
  if (!adapter) {
    return { status: 'skipped', error: 'VALUATION_PROVIDER not configured — drop in an adapter to enable' };
  }
  return { status: 'skipped', error: `Adapter '${adapter}' not implemented yet — see server/enrichment.js` };
}

const CALLERS = {
  regrid: callRegrid,
  airroi: callAirROI,
  airdna: callAirDNA,
  valuation: callValuation
};

async function runEnrichment(marina, { force = false } = {}) {
  const db = getDB();
  const existing = db.prepare('SELECT * FROM enrichments WHERE marina_id = ?').all(marina.id);
  const cache = Object.fromEntries(existing.map(e => [e.source, e]));

  const results = await Promise.all(SOURCES.map(async source => {
    const prior = cache[source];
    if (!force && prior && prior.status === 'ok' && isFresh(prior.fetched_at)) {
      return {
        source,
        status: 'ok',
        cached: true,
        fetched_at: prior.fetched_at,
        data: JSON.parse(prior.data),
        cost_estimate_cents: 0
      };
    }
    try {
      const r = await CALLERS[source](marina);
      const now = new Date().toISOString();
      if (r.status === 'ok' && r.data) {
        const cost = COST_CENTS[source] || 0;
        db.prepare(`
          INSERT INTO enrichments (marina_id, source, data, fetched_at, cost_estimate_cents, status, error_message)
          VALUES (?, ?, ?, ?, ?, 'ok', NULL)
          ON CONFLICT(marina_id, source) DO UPDATE SET
            data = excluded.data,
            fetched_at = excluded.fetched_at,
            cost_estimate_cents = excluded.cost_estimate_cents,
            status = 'ok',
            error_message = NULL
        `).run(marina.id, source, JSON.stringify(r.data), now, cost);
        return { source, status: 'ok', cached: false, fetched_at: now, data: r.data, cost_estimate_cents: cost };
      } else {
        db.prepare(`
          INSERT INTO enrichments (marina_id, source, data, fetched_at, cost_estimate_cents, status, error_message)
          VALUES (?, ?, ?, ?, 0, ?, ?)
          ON CONFLICT(marina_id, source) DO UPDATE SET
            fetched_at = excluded.fetched_at,
            status = excluded.status,
            error_message = excluded.error_message
        `).run(marina.id, source, '{}', now, r.status || 'error', r.error || null);
        return { source, status: r.status || 'error', cached: false, fetched_at: now, error: r.error || null, cost_estimate_cents: 0 };
      }
    } catch (e) {
      return { source, status: 'error', cached: false, error: e.message, cost_estimate_cents: 0 };
    }
  }));

  const cost_estimate_cents = results.reduce((a, r) => a + (r.cost_estimate_cents || 0), 0);
  return { marina_id: marina.id, results, cost_estimate_cents };
}

module.exports = { runEnrichment, FRESHNESS_DAYS, COST_CENTS };
