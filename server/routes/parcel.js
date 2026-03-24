const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

function extractFromFields(fields, geometry) {
  return {
    owner: fields.owner || fields.mail_name || 'N/A',
    apn: fields.parcelnumb || fields.apn || fields.account_number || 'N/A',
    acreage: fields.ll_gisacre || fields.gisacre || fields.acreage || 'N/A',
    assessed_value: fields.parval || fields.assdtotval || fields.totval || 'N/A',
    land_value: fields.landval || fields.assdlandval || 'N/A',
    improvement_value: fields.improvval || fields.assdimpval || 'N/A',
    zoning: fields.zoning_description || fields.zoning || 'N/A',
    legal_description: fields.legaldesc || 'N/A',
    county: fields.county || fields.geoid || 'N/A',
    last_sale_date: fields.saledate || 'N/A',
    last_sale_price: fields.saleprice || 'N/A',
    flood_zone: fields.fema_flood_zone || 'N/A',
    geometry: geometry || null,
    raw: fields
  };
}

async function typeaheadLookup(query, token) {
  const url = `https://app.regrid.com/api/v2/parcels/typeahead?query=${encodeURIComponent(query)}&token=${token}&limit=1`;
  const r = await fetch(url);
  const data = await r.json();
  const features = data.parcel_centroids?.features || [];
  return features.length > 0 ? features[0].properties.ll_uuid : null;
}

async function fetchByUUID(uuid, token) {
  const url = `https://app.regrid.com/api/v2/parcels/${uuid}?token=${token}&returnGeo=true`;
  const r = await fetch(url);
  const data = await r.json();
  const features = data.parcels?.features || [];
  return features.length > 0 ? features[0] : null;
}

// POST /api/parcel — proxy to Regrid
router.post('/', async (req, res) => {
  try {
    const { lat, lng, address } = req.body;
    const token = process.env.REGRID_API_KEY;

    if (!token) {
      return res.status(500).json({ error: 'Regrid API key not configured' });
    }

    if (!address && !lat) {
      return res.status(400).json({ error: 'Provide lat/lng or address' });
    }

    // Use typeahead to find the parcel UUID, then fetch full record
    const query = address || `${lat},${lng}`;
    const uuid = await typeaheadLookup(query, token);

    if (!uuid) {
      return res.json({ error: 'No parcel data found for this location' });
    }

    const feature = await fetchByUUID(uuid, token);

    if (!feature) {
      return res.json({ error: 'No parcel data found for this location' });
    }

    const props = feature.properties || {};
    const fields = props.fields || props;

    res.json(extractFromFields(fields, feature.geometry));
  } catch (err) {
    console.error('Parcel API error:', err);
    res.status(500).json({ error: 'Failed to fetch parcel data' });
  }
});

module.exports = router;
