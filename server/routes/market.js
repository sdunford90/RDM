const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

// POST /api/market — proxy to AirROI
router.post('/', async (req, res) => {
  try {
    const { lat, lng, radius_miles = 10 } = req.body;
    const apiKey = process.env.AIRROI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'AirROI API key not configured' });
    }

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Provide lat and lng' });
    }

    const response = await fetch('https://api.airroi.com/listings/search/radius', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        latitude: lat,
        longitude: lng,
        radius_miles: radius_miles,
        pagination: { page_size: 10, offset: 0 }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AirROI error:', response.status, errText);
      return res.json({ error: 'No STR market data available for this area' });
    }

    const data = await response.json();
    const results = data.results || [];

    if (results.length === 0) {
      return res.json({ error: 'No STR listings found in this area' });
    }

    const active_listings = data.pagination?.total_count || results.length;

    // Aggregate performance metrics across all returned listings
    const metrics = results.map(r => r.performance_metrics || {}).filter(m => m.ttm_avg_rate > 0 && m.ttm_occupancy > 0);

    const avg = (arr, key) => {
      const vals = arr.map(m => m[key]).filter(v => v != null && v > 0);
      return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 100) / 100 : null;
    };

    const avg_daily_rate = avg(metrics, 'ttm_avg_rate');
    const avg_occupancy_decimal = avg(metrics, 'ttm_occupancy');
    const avg_occupancy = avg_occupancy_decimal != null ? Math.round(avg_occupancy_decimal * 1000) / 10 : null;
    const avg_monthly_revenue = avg(metrics, 'ttm_revenue') ? Math.round(avg(metrics, 'ttm_revenue') / 12) : null;

    // Build monthly data from aggregated l90d if available
    let monthly_data = null;

    res.json({
      avg_daily_rate,
      avg_occupancy,
      avg_monthly_revenue,
      active_listings,
      market_score: null,
      radius_miles,
      monthly_data
    });
  } catch (err) {
    console.error('Market API error:', err);
    res.status(500).json({ error: 'Failed to fetch market data' });
  }
});

module.exports = router;
