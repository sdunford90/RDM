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

// ─── GET /api/listings/:id — single listing detail ───
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const currency = req.query.currency || 'usd';
    const data = await airroiGet(`/listings?id=${id}&currency=${currency}`);
    res.json(data);
  } catch (err) {
    console.error('Listing detail error:', err);
    res.json({ error: 'Failed to fetch listing detail' });
  }
});

// ─── GET /api/listings/:id/metrics — historical performance (up to 60 months) ───
router.get('/:id/metrics', async (req, res) => {
  try {
    const { id } = req.params;
    const num_months = req.query.num_months || 60;
    const currency = req.query.currency || 'usd';
    const data = await airroiGet(`/listings/metrics?id=${id}&num_months=${num_months}&currency=${currency}`);
    res.json(data);
  } catch (err) {
    console.error('Listing metrics error:', err);
    res.json({ error: 'Failed to fetch listing metrics' });
  }
});

// ─── GET /api/listings/:id/comparable — comp set ───
router.get('/:id/comparable', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await airroiGet(`/listings/comparable?id=${id}`);
    res.json(data);
  } catch (err) {
    console.error('Comparable listings error:', err);
    res.json({ error: 'Failed to fetch comps' });
  }
});

// ─── GET /api/listings/:id/future-rates — 365-day forward rates ───
router.get('/:id/future-rates', async (req, res) => {
  try {
    const { id } = req.params;
    const currency = req.query.currency || 'usd';
    const data = await airroiGet(`/listings/future/rates?id=${id}&currency=${currency}`);
    res.json(data);
  } catch (err) {
    console.error('Future rates error:', err);
    res.json({ error: 'Failed to fetch future rates' });
  }
});

// ─── POST /api/listings/batch — batch retrieve multiple listings ───
router.post('/batch', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'Provide ids array' });
    const data = await airroiPost('/listings/batch', { ids });
    res.json(data);
  } catch (err) {
    console.error('Batch listings error:', err);
    res.json({ error: 'Batch fetch failed' });
  }
});

// ─── POST /api/listings/search/radius — search by radius ───
router.post('/search/radius', async (req, res) => {
  try {
    const { lat, lng, radius_miles = 5, filter, sort, pagination } = req.body;
    if (!lat || !lng) return res.status(400).json({ error: 'Provide lat and lng' });
    const data = await airroiPost('/listings/search/radius', {
      latitude: lat, longitude: lng, radius_miles, filter, sort, pagination
    });
    res.json(data);
  } catch (err) {
    console.error('Radius search error:', err);
    res.json({ error: 'Radius search failed' });
  }
});

// ─── POST /api/listings/search/polygon — search by polygon ───
router.post('/search/polygon', async (req, res) => {
  try {
    const { polygon, filter, sort, pagination } = req.body;
    if (!polygon) return res.status(400).json({ error: 'Provide polygon coordinates' });
    const data = await airroiPost('/listings/search/polygon', { polygon, filter, sort, pagination });
    res.json(data);
  } catch (err) {
    console.error('Polygon search error:', err);
    res.json({ error: 'Polygon search failed' });
  }
});

// ─── POST /api/listings/search/market — search by market ───
router.post('/search/market', async (req, res) => {
  try {
    const { market, filter, sort, pagination } = req.body;
    if (!market) return res.status(400).json({ error: 'Provide market object' });
    const data = await airroiPost('/listings/search/market', { market, filter, sort, pagination });
    res.json(data);
  } catch (err) {
    console.error('Market search error:', err);
    res.json({ error: 'Market search failed' });
  }
});

module.exports = router;
