const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

// POST /api/market — proxy to AirROI with multi-step data aggregation
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

    // Step 1: Search nearby listings for market aggregation
    const response = await fetch('https://api.airroi.com/listings/search/radius', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        latitude: lat,
        longitude: lng,
        radius_miles: radius_miles
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
    const metrics = results
      .map(r => r.performance_metrics || {})
      .filter(m => m.ttm_avg_rate > 0 && m.ttm_occupancy > 0);

    const avg = (arr, key) => {
      const vals = arr.map(m => m[key]).filter(v => v != null && v > 0);
      return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 100) / 100 : null;
    };

    const avg_daily_rate = avg(metrics, 'ttm_avg_rate');
    const avg_occupancy_decimal = avg(metrics, 'ttm_occupancy');
    const avg_occupancy = avg_occupancy_decimal != null ? Math.round(avg_occupancy_decimal * 1000) / 10 : null;
    const avg_monthly_revenue = avg(metrics, 'ttm_revenue') ? Math.round(avg(metrics, 'ttm_revenue') / 12) : null;

    // Calculate supply growth if we have enough data
    const supply_yoy_growth = null; // Would need historical data

    // Compute avg booking lead time and LOS from listings if available
    const avg_lead_time = avg(results.map(r => r.booking_metrics || {}), 'avg_lead_time');
    const avg_los = avg(results.map(r => r.booking_metrics || {}), 'avg_length_of_stay');

    // Compute avg review score
    const avg_rating = avg(results.map(r => ({ val: r.avg_review_score || r.rating })), 'val');

    // Build monthly data from individual listing metrics if available
    let monthly_occupancy = null;
    let monthly_adr = null;
    if (metrics.length > 0 && metrics[0].monthly_occupancy) {
      monthly_occupancy = metrics[0].monthly_occupancy; // Use first listing as proxy
    }
    if (metrics.length > 0 && metrics[0].monthly_adr) {
      monthly_adr = metrics[0].monthly_adr;
    }

    // Step 2: Property revenue estimate (closest listing as proxy)
    let estimate = null;
    if (results.length > 0) {
      const closest = results[0];
      const perf = closest.performance_metrics || {};
      if (perf.ttm_revenue || perf.ttm_avg_rate) {
        estimate = {
          projected_annual_revenue: perf.ttm_revenue || null,
          projected_adr: perf.ttm_avg_rate || avg_daily_rate,
          projected_occupancy: perf.ttm_occupancy ? Math.round(perf.ttm_occupancy * 1000) / 10 : avg_occupancy,
          comp_count: results.length,
          monthly_revenue_breakdown: perf.monthly_revenue || null
        };
      }
    }

    // Step 3: Check if the property itself is an active listing (very close)
    let listing = null;
    if (results.length > 0) {
      const closest = results[0];
      // If the closest listing is within ~0.05 miles, it might be the property itself
      if (closest.distance_miles != null && closest.distance_miles < 0.05) {
        listing = {
          listing_id: closest.listing_id || closest.id,
          listing_data: {
            avg_review_score: closest.avg_review_score || null,
            review_count: closest.review_count || null,
            min_stay_requirements: closest.min_nights || closest.min_stay || null,
            platform: closest.platform || null,
            title: closest.title || null
          },
          history: closest.performance_metrics || null,
          future_rates: null
        };
      }
    }

    res.json({
      // Summary KPIs (flat for backward compat + nested for new UI)
      avg_daily_rate,
      avg_occupancy,
      avg_monthly_revenue,
      active_listings,
      market_score: null,
      radius_miles,

      // New structured format
      summary: {
        avg_daily_rate,
        avg_occupancy,
        avg_monthly_revenue,
        active_listings,
        avg_rating
      },

      metrics: {
        occupancy: monthly_occupancy ? { monthly: monthly_occupancy } : null,
        adr: monthly_adr ? { monthly: monthly_adr } : null,
        revpar: avg_daily_rate && avg_occupancy ? {
          value: Math.round(avg_daily_rate * (avg_occupancy / 100) * 100) / 100
        } : null,
        supply: { count: active_listings, yoy_growth: supply_yoy_growth },
        booking_lead_time: avg_lead_time ? { avg: avg_lead_time } : null,
        length_of_stay: avg_los ? { avg: avg_los } : null,
        pacing: null
      },

      estimate,
      listing,

      // Legacy field
      monthly_data: null
    });
  } catch (err) {
    console.error('Market API error:', err);
    res.status(500).json({ error: 'Failed to fetch market data' });
  }
});

module.exports = router;
