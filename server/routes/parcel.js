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
    county: fields.county || 'N/A',
    last_sale_date: fields.saledate || 'N/A',
    last_sale_price: fields.saleprice || 'N/A',
    flood_zone: fields.fema_flood_zone || 'N/A',
    geometry: geometry || null,
    raw: fields
  };
}

// Haversine distance in miles between two lat/lng points
function distanceMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function typeaheadLookup(query, token, lat, lng) {
  const url = `https://app.regrid.com/api/v2/parcels/typeahead?query=${encodeURIComponent(query)}&token=${token}&limit=10`;
  const r = await fetch(url);
  const data = await r.json();
  const features = data.parcel_centroids?.features || [];

  if (features.length === 0) return null;

  // If we have coordinates, pick the closest result within 25 miles
  if (lat && lng) {
    let best = null;
    let bestDist = Infinity;
    for (const f of features) {
      const [fLng, fLat] = f.geometry.coordinates;
      const dist = distanceMiles(lat, lng, fLat, fLng);
      if (dist < bestDist) {
        bestDist = dist;
        best = f;
      }
    }
    // Reject if the closest match is more than 25 miles away
    if (bestDist > 25) return null;
    return best?.properties?.ll_uuid || null;
  }

  return features[0].properties.ll_uuid;
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

    const uuid = await typeaheadLookup(address || '', token, lat, lng);

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
