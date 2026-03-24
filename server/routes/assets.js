const express = require('express');
const { saveAsset, getAsset, listAssets, deleteAsset } = require('../db');
const router = express.Router();

// GET /api/assets — list all
router.get('/', async (req, res) => {
  try {
    const assets = await listAssets();
    res.json(assets);
  } catch (err) {
    console.error('List assets error:', err);
    res.status(500).json({ error: 'Failed to list assets' });
  }
});

// GET /api/assets/:id — get single
router.get('/:id', async (req, res) => {
  try {
    const asset = await getAsset(req.params.id);
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    res.json(asset);
  } catch (err) {
    console.error('Get asset error:', err);
    res.status(500).json({ error: 'Failed to get asset' });
  }
});

// POST /api/assets — create or update
router.post('/', async (req, res) => {
  try {
    const asset = await saveAsset(req.body);
    res.json(asset);
  } catch (err) {
    console.error('Save asset error:', err);
    res.status(500).json({ error: 'Failed to save asset' });
  }
});

// DELETE /api/assets/:id — delete
router.delete('/:id', async (req, res) => {
  try {
    await deleteAsset(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete asset error:', err);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

module.exports = router;
