const express = require('express');
const { google } = require('googleapis');
const fetch = require('node-fetch');
const router = express.Router();

// ─── In-memory cache ───
let sheetsCache = { headers: null, rows: null, lastFetched: null };
const geocodeCache = new Map(); // address → { lat, lng }
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ─── Google Auth ───
function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const creds = JSON.parse(raw);
    return new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });
  } catch (e) {
    console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:', e.message);
    return null;
  }
}

// ─── Fetch sheet data ───
async function fetchSheetData() {
  const auth = getAuth();
  if (!auth) throw new Error('Google service account not configured');

  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) throw new Error('GOOGLE_SHEET_ID not configured');

  const sheets = google.sheets({ version: 'v4', auth });
  const sheetName = process.env.GOOGLE_SHEET_NAME || undefined;

  // Get sheet metadata to find the name if not specified
  let range;
  if (sheetName) {
    range = `${sheetName}`;
  } else {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const firstSheet = meta.data.sheets?.[0]?.properties?.title;
    range = firstSheet || 'Sheet1';
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range
  });

  const values = response.data.values || [];
  if (values.length === 0) return { headers: [], rows: [] };

  const headers = values[0];
  const rows = values.slice(1).map((row, idx) => {
    const obj = { _rowIndex: idx + 2 }; // 1-indexed, +1 for header
    headers.forEach((h, i) => {
      obj[h] = row[i] || '';
    });
    return obj;
  });

  return { headers, rows };
}

// ─── Smart address column detection ───
function findAddressColumn(headers) {
  const envCol = process.env.GOOGLE_SHEET_ADDRESS_COLUMN;
  if (envCol && headers.includes(envCol)) return envCol;

  const candidates = ['Address', 'address', 'Property Address', 'property address',
    'Location', 'location', 'Full Address', 'full address', 'PROPERTY ADDRESS',
    'ADDRESS', 'Site Address', 'Property'];
  for (const c of candidates) {
    if (headers.includes(c)) return c;
  }
  // Fuzzy: first header containing "address" or "location"
  const fuzzy = headers.find(h => /address|location/i.test(h));
  return fuzzy || null;
}

// ─── Geocode a single address via Mapbox ───
async function geocodeAddress(address) {
  if (!address || address.trim().length < 5) return null;
  if (geocodeCache.has(address)) return geocodeCache.get(address);

  const token = process.env.MAPBOX_TOKEN;
  if (!token) return null;

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${token}&country=US&limit=1`;
    const r = await fetch(url);
    const data = await r.json();
    const feature = data.features?.[0];
    if (!feature) return null;

    const [lng, lat] = feature.center;
    const result = { lat, lng };
    geocodeCache.set(address, result);
    return result;
  } catch (e) {
    console.error('Geocode error for', address, e.message);
    return null;
  }
}

// ─── Merge geocode data into rows ───
function mergeGeocode(rows, addressCol) {
  return rows.map(row => {
    const addr = row[addressCol];
    const cached = addr ? geocodeCache.get(addr) : null;
    return {
      ...row,
      _lat: cached?.lat || parseFloat(row.lat || row.Lat || row.Latitude || row.latitude) || null,
      _lng: cached?.lng || parseFloat(row.lng || row.Lng || row.Longitude || row.longitude || row.lon || row.Lon) || null
    };
  });
}

// ─── GET /api/sheets — return all rows (cached) ───
router.get('/', async (req, res) => {
  try {
    const now = Date.now();
    if (sheetsCache.rows && sheetsCache.lastFetched && (now - sheetsCache.lastFetched) < CACHE_TTL) {
      const addressCol = findAddressColumn(sheetsCache.headers);
      return res.json({
        headers: sheetsCache.headers,
        rows: mergeGeocode(sheetsCache.rows, addressCol),
        addressColumn: addressCol,
        cachedAt: new Date(sheetsCache.lastFetched).toISOString(),
        total: sheetsCache.rows.length
      });
    }

    const data = await fetchSheetData();
    sheetsCache = { headers: data.headers, rows: data.rows, lastFetched: now };

    const addressCol = findAddressColumn(data.headers);
    res.json({
      headers: data.headers,
      rows: mergeGeocode(data.rows, addressCol),
      addressColumn: addressCol,
      cachedAt: new Date(now).toISOString(),
      total: data.rows.length
    });
  } catch (err) {
    console.error('Sheets API error:', err.message);
    if (err.message.includes('not configured')) {
      return res.json({ headers: [], rows: [], error: err.message, total: 0 });
    }
    res.status(500).json({ error: 'Failed to fetch sheet data', detail: err.message });
  }
});

// ─── GET /api/sheets/refresh — force re-fetch ───
router.get('/refresh', async (req, res) => {
  try {
    sheetsCache = { headers: null, rows: null, lastFetched: null };
    const data = await fetchSheetData();
    const now = Date.now();
    sheetsCache = { headers: data.headers, rows: data.rows, lastFetched: now };

    const addressCol = findAddressColumn(data.headers);
    res.json({
      headers: data.headers,
      rows: mergeGeocode(data.rows, addressCol),
      addressColumn: addressCol,
      cachedAt: new Date(now).toISOString(),
      total: data.rows.length
    });
  } catch (err) {
    console.error('Sheets refresh error:', err.message);
    res.status(500).json({ error: 'Failed to refresh sheet data' });
  }
});

// ─── POST /api/sheets/geocode — batch geocode rows missing lat/lng ───
router.post('/geocode', async (req, res) => {
  try {
    if (!sheetsCache.rows || !sheetsCache.headers) {
      return res.status(400).json({ error: 'Load sheet data first (GET /api/sheets)' });
    }

    const addressCol = findAddressColumn(sheetsCache.headers);
    if (!addressCol) {
      return res.status(400).json({ error: 'No address column found in sheet headers' });
    }

    const needsGeocoding = sheetsCache.rows.filter(row => {
      const addr = row[addressCol];
      if (!addr || addr.trim().length < 5) return false;
      if (geocodeCache.has(addr)) return false;
      // Check if row already has lat/lng columns
      const hasCoords = row.lat || row.Lat || row.Latitude || row.latitude;
      return !hasCoords;
    });

    let geocoded = 0;
    const batchSize = 10;
    for (let i = 0; i < needsGeocoding.length; i += batchSize) {
      const batch = needsGeocoding.slice(i, i + batchSize);
      await Promise.all(batch.map(async row => {
        const result = await geocodeAddress(row[addressCol]);
        if (result) geocoded++;
      }));
      // Throttle: 100ms between batches
      if (i + batchSize < needsGeocoding.length) {
        await new Promise(r => setTimeout(r, 100));
      }
    }

    res.json({
      total: sheetsCache.rows.length,
      geocoded,
      alreadyCached: geocodeCache.size,
      pending: needsGeocoding.length - geocoded
    });
  } catch (err) {
    console.error('Geocode batch error:', err.message);
    res.status(500).json({ error: 'Geocoding failed' });
  }
});

module.exports = router;
