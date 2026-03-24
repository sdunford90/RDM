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

    // AirROI market endpoint
    const url = `https://api.airroi.com/v1/market?lat=${lat}&lng=${lng}&radius=${radius_miles}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      // Return a structured fallback so frontend can handle gracefully
      return res.json({
        error: 'No STR market data available for this area',
        avg_daily_rate: null,
        avg_occupancy: null,
        avg_monthly_revenue: null,
        active_listings: null,
        market_score: null,
        radius_miles,
        monthly_data: null
      });
    }

    const data = await response.json();

    res.json({
      avg_daily_rate: data.avg_daily_rate || data.adr || null,
      avg_occupancy: data.avg_occupancy || data.occupancy_rate || null,
      avg_monthly_revenue: data.avg_monthly_revenue || data.monthly_revenue || null,
      active_listings: data.active_listings || data.listing_count || null,
      market_score: data.market_score || null,
      radius_miles,
      monthly_data: data.monthly_data || data.seasonal_data || null,
      raw: data
    });
  } catch (err) {
    console.error('Market API error:', err);
    res.status(500).json({ error: 'Failed to fetch market data' });
  }
});

module.exports = router;
