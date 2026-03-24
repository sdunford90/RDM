const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

const AIRROI_BASE = 'https://api.airroi.com';

function headers() {
  return { 'X-API-KEY': process.env.AIRROI_API_KEY, 'Content-Type': 'application/json' };
}

async function airroiGet(path) {
  const res = await fetch(`${AIRROI_BASE}${path}`, { headers: headers(), timeout: 15000 });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`AirROI GET ${res.status}: ${errText.slice(0, 200)}`);
  }
  return res.json();
}

async function airroiPost(path, body) {
  const res = await fetch(`${AIRROI_BASE}${path}`, { method: 'POST', headers: headers(), body: JSON.stringify(body), timeout: 15000 });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`AirROI POST ${res.status}: ${errText.slice(0, 200)}`);
  }
  return res.json();
}

// ─── EXISTING: POST /api/market — radius search + aggregation ───
router.post('/', async (req, res) => {
  try {
    const { lat, lng, radius_miles = 10 } = req.body;
    if (!process.env.AIRROI_API_KEY) return res.status(500).json({ error: 'AirROI API key not configured' });
    if (!lat || !lng) return res.status(400).json({ error: 'Provide lat and lng' });

    const data = await airroiPost('/listings/search/radius', { latitude: lat, longitude: lng, radius_miles });
    const results = data.results || [];
    if (results.length === 0) return res.json({ error: 'No STR listings found in this area' });

    const active_listings = data.pagination?.total_count || results.length;
    const metrics = results.map(r => r.performance_metrics || {}).filter(m => m.ttm_avg_rate > 0 && m.ttm_occupancy > 0);
    const avg = (arr, key) => { const vals = arr.map(m => m[key]).filter(v => v != null && v > 0); return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 100) / 100 : null; };

    const avg_daily_rate = avg(metrics, 'ttm_avg_rate');
    const avg_occupancy_decimal = avg(metrics, 'ttm_occupancy');
    const avg_occupancy = avg_occupancy_decimal != null ? Math.round(avg_occupancy_decimal * 1000) / 10 : null;
    const avg_monthly_revenue = avg(metrics, 'ttm_revenue') ? Math.round(avg(metrics, 'ttm_revenue') / 12) : null;
    const avg_rating = avg(results.map(r => ({ val: r.avg_review_score || r.rating })), 'val');

    let monthly_occupancy = metrics.length > 0 && metrics[0].monthly_occupancy ? metrics[0].monthly_occupancy : null;
    let monthly_adr = metrics.length > 0 && metrics[0].monthly_adr ? metrics[0].monthly_adr : null;

    let estimate = null;
    if (results.length > 0) {
      const perf = results[0].performance_metrics || {};
      if (perf.ttm_revenue || perf.ttm_avg_rate) {
        estimate = { projected_annual_revenue: perf.ttm_revenue || null, projected_adr: perf.ttm_avg_rate || avg_daily_rate, projected_occupancy: perf.ttm_occupancy ? Math.round(perf.ttm_occupancy * 1000) / 10 : avg_occupancy, comp_count: results.length, monthly_revenue_breakdown: perf.monthly_revenue || null };
      }
    }

    let listing = null;
    if (results.length > 0 && results[0].distance_miles != null && results[0].distance_miles < 0.05) {
      const c = results[0];
      listing = { listing_id: c.listing_id || c.id, listing_data: { avg_review_score: c.avg_review_score || null, review_count: c.review_count || null, min_stay_requirements: c.min_nights || c.min_stay || null, platform: c.platform || null, title: c.title || null }, history: c.performance_metrics || null, future_rates: null };
    }

    res.json({
      avg_daily_rate, avg_occupancy, avg_monthly_revenue, active_listings, market_score: null, radius_miles,
      summary: { avg_daily_rate, avg_occupancy, avg_monthly_revenue, active_listings, avg_rating },
      metrics: {
        occupancy: monthly_occupancy ? { monthly: monthly_occupancy } : null,
        adr: monthly_adr ? { monthly: monthly_adr } : null,
        revpar: avg_daily_rate && avg_occupancy ? { value: Math.round(avg_daily_rate * (avg_occupancy / 100) * 100) / 100 } : null,
        supply: { count: active_listings, yoy_growth: null },
        booking_lead_time: null, length_of_stay: null, pacing: null
      },
      estimate, listing, monthly_data: null
    });
  } catch (err) {
    console.error('Market API error:', err);
    res.status(500).json({ error: 'Failed to fetch market data' });
  }
});

// ─── NEW: POST /api/market/lookup — find market by coordinates ───
router.post('/lookup', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (!lat || !lng) return res.status(400).json({ error: 'Provide lat and lng' });
    const data = await airroiGet(`/markets/lookup?lat=${lat}&lng=${lng}`);
    res.json(data);
  } catch (err) {
    console.error('Market lookup error:', err);
    res.json({ error: 'Market lookup failed' });
  }
});

// ─── NEW: POST /api/market/summary — market summary stats ───
router.post('/summary', async (req, res) => {
  try {
    const { market } = req.body;
    if (!market) return res.status(400).json({ error: 'Provide market object' });
    const data = await airroiPost('/markets/summary', { market });
    res.json(data);
  } catch (err) {
    console.error('Market summary error:', err);
    res.json({ error: 'Market summary failed' });
  }
});

// ─── NEW: POST /api/market/metrics/all — full 60-month historical dataset ───
router.post('/metrics/all', async (req, res) => {
  try {
    const { market, filter, num_months = 60, currency = 'usd' } = req.body;
    if (!market) return res.status(400).json({ error: 'Provide market object' });
    const data = await airroiPost('/markets/metrics/all', { market, filter, num_months, currency });
    res.json(data);
  } catch (err) {
    console.error('Market metrics/all error:', err);
    res.json({ error: 'Failed to fetch market metrics' });
  }
});

// ─── NEW: Individual metric endpoints ───
const metricEndpoints = [
  { route: 'average-daily-rate', airroi: 'average-daily-rate' },
  { route: 'occupancy', airroi: 'occupancy' },
  { route: 'revpar', airroi: 'revpar' },
  { route: 'revenue', airroi: 'revenue' },
  { route: 'active-listings', airroi: 'active-listings' },
  { route: 'booking-lead-time', airroi: 'booking-lead-time' },
  { route: 'length-of-stay', airroi: 'length-of-stay' },
];

metricEndpoints.forEach(({ route, airroi }) => {
  router.post(`/metrics/${route}`, async (req, res) => {
    try {
      const { market, filter, num_months = 24, currency = 'usd' } = req.body;
      if (!market) return res.status(400).json({ error: 'Provide market object' });
      const data = await airroiPost(`/markets/metrics/${airroi}`, { market, filter, num_months, currency });
      res.json(data);
    } catch (err) {
      console.error(`Market metric ${route} error:`, err);
      res.json({ error: `Failed to fetch ${route}` });
    }
  });
});

// ─── NEW: POST /api/market/metrics/future-pacing — forward-looking demand ───
router.post('/metrics/future-pacing', async (req, res) => {
  try {
    const { market, filter, currency = 'usd' } = req.body;
    if (!market) return res.status(400).json({ error: 'Provide market object' });
    const data = await airroiPost('/markets/metrics/future/pacing', { market, filter, currency });
    res.json(data);
  } catch (err) {
    console.error('Future pacing error:', err);
    res.json({ error: 'Failed to fetch pacing data' });
  }
});

// ─── NEW: POST /api/market/calculator — revenue estimate ───
router.post('/calculator', async (req, res) => {
  try {
    const { lat, lng, currency = 'usd', bedrooms = 2, baths = 1, guests = 4 } = req.body;
    if (!lat || !lng) return res.status(400).json({ error: 'Provide lat and lng' });
    const params = new URLSearchParams({ lat, lng, currency, bedrooms, baths, guests }).toString();
    const data = await airroiGet(`/calculator/estimate?${params}`);
    res.json(data);
  } catch (err) {
    console.error('Calculator error:', err);
    res.json({ error: 'Revenue estimate failed' });
  }
});

module.exports = router;
