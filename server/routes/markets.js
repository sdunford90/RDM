const express = require('express');
const router = express.Router();
const { saveMarket, listMarkets, getMarket, deleteMarket } = require('../db');
const { calculateMarketScore } = require('../utils/marketScore');

// GET /api/markets — list all tracked markets with scores
router.get('/', async (req, res) => {
  try {
    const markets = await listMarkets();
    res.json(markets);
  } catch (err) {
    console.error('List markets error:', err);
    res.status(500).json({ error: 'Failed to list markets' });
  }
});

// GET /api/markets/:id — full market detail
router.get('/:id', async (req, res) => {
  try {
    const market = await getMarket(req.params.id);
    if (!market) return res.status(404).json({ error: 'Market not found' });
    res.json(market);
  } catch (err) {
    console.error('Get market error:', err);
    res.status(500).json({ error: 'Failed to get market' });
  }
});

// POST /api/markets — upsert market with score calculation
router.post('/', async (req, res) => {
  try {
    const { name, lat, lng, adr, occupancy, revpar, monthlyRev, listings, supplyGrowth, data } = req.body;
    if (!name || lat == null || lng == null) {
      return res.status(400).json({ error: 'Market name, lat, and lng are required' });
    }

    const score = calculateMarketScore({ adr, occupancy, revpar, supplyGrowth, listings });

    const market = await saveMarket({
      name, lat, lng,
      adr: adr || null,
      occupancy: occupancy || null,
      revpar: revpar || null,
      monthlyRev: monthlyRev || null,
      listings: listings ? Math.round(listings) : null,
      supplyGrowth: supplyGrowth || null,
      score,
      data: data || null
    });

    res.json(market);
  } catch (err) {
    console.error('Save market error:', err);
    res.status(500).json({ error: 'Failed to save market' });
  }
});

// DELETE /api/markets/:id
router.delete('/:id', async (req, res) => {
  try {
    await deleteMarket(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete market error:', err);
    res.status(500).json({ error: 'Failed to delete market' });
  }
});

module.exports = router;
