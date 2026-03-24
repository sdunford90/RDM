const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

// POST /api/parcel — proxy to Regrid
router.post('/', async (req, res) => {
  try {
    const { lat, lng, address } = req.body;
    const token = process.env.REGRID_API_KEY;

    if (!token) {
      return res.status(500).json({ error: 'Regrid API key not configured' });
    }

    let url;
    if (lat && lng) {
      url = `https://app.regrid.com/api/v2/parcels/point?lat=${lat}&lon=${lng}&token=${token}&returnGeo=true`;
    } else if (address) {
      url = `https://app.regrid.com/api/v2/parcels/address?query=${encodeURIComponent(address)}&token=${token}&returnGeo=true`;
    } else {
      return res.status(400).json({ error: 'Provide lat/lng or address' });
    }

    const response = await fetch(url);
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      // Try alternate response format
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const props = feature.properties || {};
        return res.json({
          owner: props.owner || props.mail_name || 'N/A',
          apn: props.parcelnumb || props.apn || 'N/A',
          acreage: props.ll_gisacre || props.gisacre || props.acreage || 'N/A',
          assessed_value: props.assdtotval || props.totval || 'N/A',
          land_value: props.assdlandval || props.landval || 'N/A',
          improvement_value: props.assdimpval || props.impval || 'N/A',
          zoning: props.zoning || props.zoning_description || 'N/A',
          legal_description: props.legaldesc || 'N/A',
          county: props.county || 'N/A',
          last_sale_date: props.saledate || 'N/A',
          last_sale_price: props.saleprice || 'N/A',
          flood_zone: props.fema_flood_zone || 'N/A',
          geometry: feature.geometry || null,
          raw: props
        });
      }
      return res.json({ error: 'No parcel data found for this location' });
    }

    const feature = data.results[0];
    const props = feature.properties || {};

    res.json({
      owner: props.owner || props.mail_name || 'N/A',
      apn: props.parcelnumb || props.apn || 'N/A',
      acreage: props.ll_gisacre || props.gisacre || props.acreage || 'N/A',
      assessed_value: props.assdtotval || props.totval || 'N/A',
      land_value: props.assdlandval || props.landval || 'N/A',
      improvement_value: props.assdimpval || props.impval || 'N/A',
      zoning: props.zoning || props.zoning_description || 'N/A',
      legal_description: props.legaldesc || 'N/A',
      county: props.county || 'N/A',
      last_sale_date: props.saledate || 'N/A',
      last_sale_price: props.saleprice || 'N/A',
      flood_zone: props.fema_flood_zone || 'N/A',
      geometry: feature.geometry || null,
      raw: props
    });
  } catch (err) {
    console.error('Parcel API error:', err);
    res.status(500).json({ error: 'Failed to fetch parcel data' });
  }
});

module.exports = router;
