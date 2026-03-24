const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

// Helper to safely extract a field with fallbacks
function get(props, ...keys) {
  for (const k of keys) {
    if (props[k] != null && props[k] !== '') return props[k];
  }
  return null;
}

// Extract all Regrid fields organized by section
function extractAllFields(fields, geometry) {
  return {
    // 1A: Identity & Location
    identity: {
      ll_uuid: get(fields, 'll_uuid'),
      parcelnumb: get(fields, 'parcelnumb', 'apn'),
      state_parcelnumb: get(fields, 'state_parcelnumb'),
      account_number: get(fields, 'account_number'),
      geoid: get(fields, 'geoid'),
      path: get(fields, 'path'),
      address: get(fields, 'address'),
      scity: get(fields, 'scity'),
      county: get(fields, 'county'),
      state2: get(fields, 'state2'),
      szip: get(fields, 'szip'),
      lat: get(fields, 'lat'),
      lon: get(fields, 'lon'),
      location_name: get(fields, 'location_name'),
      sourceurl: get(fields, 'sourceurl'),
      ll_last_refresh: get(fields, 'll_last_refresh')
    },
    // 1B: Ownership
    ownership: {
      owner: get(fields, 'owner'),
      unmodified_owner: get(fields, 'unmodified_owner'),
      ownfrst: get(fields, 'ownfrst'),
      ownlast: get(fields, 'ownlast'),
      owner2: get(fields, 'owner2'),
      owner3: get(fields, 'owner3'),
      owner4: get(fields, 'owner4'),
      previous_owner: get(fields, 'previous_owner'),
      owntype: get(fields, 'owntype'),
      mailadd: get(fields, 'mailadd'),
      mail_city: get(fields, 'mail_city'),
      mail_state2: get(fields, 'mail_state2'),
      mail_zip: get(fields, 'mail_zip'),
      mail_country: get(fields, 'mail_country'),
      careof: get(fields, 'careof')
    },
    // 1C: Sale & Transfer History
    sale: {
      saleprice: get(fields, 'saleprice'),
      saledate: get(fields, 'saledate'),
      last_ownership_transfer_date: get(fields, 'last_ownership_transfer_date'),
      previous_owner: get(fields, 'previous_owner')
    },
    // 1D: Tax & Valuation
    tax: {
      parval: get(fields, 'parval', 'assdtotval', 'totval'),
      landval: get(fields, 'landval', 'assdlandval'),
      improvval: get(fields, 'improvval', 'assdimpval', 'impval'),
      agval: get(fields, 'agval'),
      parvaltype: get(fields, 'parvaltype'),
      taxamt: get(fields, 'taxamt'),
      taxyear: get(fields, 'taxyear')
    },
    // 1E: Physical & Structure
    physical: {
      ll_gisacre: get(fields, 'll_gisacre'),
      gisacre: get(fields, 'gisacre'),
      deeded_acres: get(fields, 'deeded_acres'),
      ll_gissqft: get(fields, 'll_gissqft'),
      area_building: get(fields, 'area_building'),
      area_building_definition: get(fields, 'area_building_definition'),
      structno: get(fields, 'structno'),
      yearbuilt: get(fields, 'yearbuilt'),
      year_built_effective_date: get(fields, 'year_built_effective_date'),
      numstories: get(fields, 'numstories'),
      numunits: get(fields, 'numunits'),
      num_bedrooms: get(fields, 'num_bedrooms'),
      num_bath: get(fields, 'num_bath'),
      structstyle: get(fields, 'structstyle')
    },
    // 1F: Land Use & Zoning
    landuse: {
      usecode: get(fields, 'usecode'),
      usedesc: get(fields, 'usedesc'),
      zoning: get(fields, 'zoning'),
      zoning_description: get(fields, 'zoning_description'),
      lbcs_activity: get(fields, 'lbcs_activity'),
      legaldesc: get(fields, 'legaldesc'),
      lot: get(fields, 'lot'),
      block: get(fields, 'block'),
      subdivision: get(fields, 'subdivision'),
      plat: get(fields, 'plat'),
      book: get(fields, 'book'),
      page: get(fields, 'page')
    },
    // 1G: Federal Designations
    federal: {
      qoz: get(fields, 'qoz'),
      qoz_tract: get(fields, 'qoz_tract'),
      fema_flood_zone: get(fields, 'fema_flood_zone'),
      fema_flood_zone_subtype: get(fields, 'fema_flood_zone_subtype'),
      fema_nri_risk_rating: get(fields, 'fema_nri_risk_rating'),
      census_tract: get(fields, 'census_tract'),
      census_blockgroup: get(fields, 'census_blockgroup')
    },
    // 1H: Premium Fields
    premium: {
      zoning_type: get(fields, 'zoning_type'),
      zoning_code_link: get(fields, 'zoning_code_link'),
      ll_bldg_footprint_sqft: get(fields, 'll_bldg_footprint_sqft'),
      ll_bldg_count: get(fields, 'll_bldg_count'),
      ll_address_count: get(fields, 'll_address_count'),
      homestead_exemption: get(fields, 'homestead_exemption'),
      elevation_highest: get(fields, 'elevation_highest'),
      elevation_lowest: get(fields, 'elevation_lowest'),
      elevation_roughness: get(fields, 'elevation_roughness')
    },
    // 1I: Enhanced Ownership
    enhanced_ownership: {
      eo_owner: get(fields, 'eo_owner'),
      eo_ownerfirst: get(fields, 'eo_ownerfirst'),
      eo_ownerlast: get(fields, 'eo_ownerlast'),
      eo_owner2: get(fields, 'eo_owner2'),
      eo_owner3: get(fields, 'eo_owner3'),
      eo_owner4: get(fields, 'eo_owner4'),
      eo_deedowner: get(fields, 'eo_deedowner'),
      eo_deedowner2: get(fields, 'eo_deedowner2'),
      eo_deedowner3: get(fields, 'eo_deedowner3'),
      eo_deedowner4: get(fields, 'eo_deedowner4'),
      eo_mail_address: get(fields, 'eo_mail_address'),
      eo_mail_city: get(fields, 'eo_mail_city'),
      eo_mail_state: get(fields, 'eo_mail_state'),
      eo_mail_zip: get(fields, 'eo_mail_zip')
    },
    geometry: geometry || null
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

// POST /api/parcel — proxy to Regrid with full field extraction
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
    const result = extractAllFields(fields, feature.geometry);

    // Detect non-arms-length transfer
    const saleDate = result.sale.saledate;
    const transferDate = result.sale.last_ownership_transfer_date;
    result.nonArmsLength = (saleDate && transferDate && saleDate !== transferDate) || false;

    res.json(result);
  } catch (err) {
    console.error('Parcel API error:', err);
    res.status(500).json({ error: 'Failed to fetch parcel data' });
  }
});

// POST /api/parcel/adjacent — fetch nearby parcels from Regrid point API
router.post('/adjacent', async (req, res) => {
  try {
    const { lat, lng, radius = 300, limit = 50 } = req.body;
    const token = process.env.REGRID_API_KEY;

    if (!token) return res.status(500).json({ error: 'Regrid API key not configured' });
    if (!lat || !lng) return res.status(400).json({ error: 'Provide lat and lng' });

    // Regrid point endpoint with radius returns all parcels within radius (meters)
    const url = `https://app.regrid.com/api/v2/parcels/point?lat=${lat}&lon=${lng}&token=${token}&radius=${radius}&limit=${limit}&return_geometry=true&return_custom=false`;
    const r = await fetch(url);

    if (!r.ok) {
      const errText = await r.text().catch(() => '');
      console.error('Regrid adjacent error:', r.status, errText.slice(0, 200));
      return res.json({ parcels: [], error: 'Failed to fetch adjacent parcels' });
    }

    const data = await r.json();
    const features = data.parcels?.features || data.features || [];

    // Extract key fields from each parcel for the frontend
    const parcels = features.map(f => {
      const props = f.properties || {};
      const fields = props.fields || props;
      return {
        ll_uuid: get(fields, 'll_uuid'),
        parcelnumb: get(fields, 'parcelnumb', 'apn'),
        owner: get(fields, 'owner'),
        owner2: get(fields, 'owner2'),
        owner3: get(fields, 'owner3'),
        owner4: get(fields, 'owner4'),
        mailadd: get(fields, 'mailadd'),
        mail_zip: get(fields, 'mail_zip'),
        ll_gisacre: get(fields, 'll_gisacre'),
        parval: get(fields, 'parval', 'assdtotval'),
        landval: get(fields, 'landval'),
        improvval: get(fields, 'improvval'),
        taxamt: get(fields, 'taxamt'),
        usedesc: get(fields, 'usedesc'),
        zoning: get(fields, 'zoning'),
        yearbuilt: get(fields, 'yearbuilt'),
        saleprice: get(fields, 'saleprice'),
        saledate: get(fields, 'saledate'),
        fema_flood_zone: get(fields, 'fema_flood_zone'),
        address: get(fields, 'address'),
        scity: get(fields, 'scity'),
        state2: get(fields, 'state2'),
        geometry: f.geometry || null
      };
    });

    res.json({ parcels, total: parcels.length });
  } catch (err) {
    console.error('Adjacent parcel error:', err);
    res.json({ parcels: [], error: 'Failed to fetch adjacent parcels' });
  }
});

module.exports = router;
