const API_BASE = '/api';

// ─── Core endpoints ───

export async function fetchMapboxToken() {
  const res = await fetch(`${API_BASE}/mapbox-token`);
  const data = await res.json();
  return data.token;
}

export async function fetchParcelData({ lat, lng, address }) {
  const res = await fetch(`${API_BASE}/parcel`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lng, address })
  });
  return res.json();
}

export async function fetchAdjacentParcels({ lat, lng, radius = 300, limit = 50 }) {
  const res = await fetch(`${API_BASE}/parcel/adjacent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lng, radius, limit })
  });
  return res.json();
}

export async function fetchMarketData({ lat, lng, radius_miles = 10 }) {
  const res = await fetch(`${API_BASE}/market`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lng, radius_miles })
  });
  return res.json();
}

// ─── Asset CRUD ───

export async function listAssets() {
  const res = await fetch(`${API_BASE}/assets`);
  return res.json();
}

export async function getAsset(id) {
  const res = await fetch(`${API_BASE}/assets/${id}`);
  return res.json();
}

export async function saveAsset(asset) {
  const res = await fetch(`${API_BASE}/assets`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(asset)
  });
  return res.json();
}

export async function deleteAsset(id) {
  const res = await fetch(`${API_BASE}/assets/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function updateAssetStage(id, stage) {
  const res = await fetch(`${API_BASE}/assets/${id}/stage`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage })
  });
  return res.json();
}

// ─── Pipeline (Google Sheets) ───

export async function fetchPipeline() {
  const res = await fetch(`${API_BASE}/sheets`);
  return res.json();
}

export async function refreshPipeline() {
  const res = await fetch(`${API_BASE}/sheets/refresh`);
  return res.json();
}

export async function geocodePipeline() {
  const res = await fetch(`${API_BASE}/sheets/geocode`, { method: 'POST' });
  return res.json();
}

// ─── Market Tracker ───

export async function fetchMarkets() {
  const res = await fetch(`${API_BASE}/markets`);
  return res.json();
}

export async function saveMarketData(market) {
  const res = await fetch(`${API_BASE}/markets`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(market)
  });
  return res.json();
}

// ─── Market endpoints (new) ───

export async function lookupMarket({ lat, lng }) {
  const res = await fetch(`${API_BASE}/market/lookup`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lng })
  });
  return res.json();
}

export async function fetchMarketSummary({ market }) {
  const res = await fetch(`${API_BASE}/market/summary`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ market })
  });
  return res.json();
}

export async function fetchAllMarketMetrics({ market, filter, num_months = 60 }) {
  const res = await fetch(`${API_BASE}/market/metrics/all`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ market, filter, num_months, currency: 'usd' })
  });
  return res.json();
}

export async function fetchMarketMetric(metricName, { market, filter, num_months = 24 }) {
  const res = await fetch(`${API_BASE}/market/metrics/${metricName}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ market, filter, num_months, currency: 'usd' })
  });
  return res.json();
}

export async function fetchFuturePacing({ market, filter }) {
  const res = await fetch(`${API_BASE}/market/metrics/future-pacing`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ market, filter, currency: 'usd' })
  });
  return res.json();
}

export async function fetchRevenueEstimate({ lat, lng, bedrooms = 2, baths = 1, guests = 4 }) {
  const res = await fetch(`${API_BASE}/market/calculator`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lng, currency: 'usd', bedrooms, baths, guests })
  });
  return res.json();
}

// ─── Listing endpoints (new) ───

export async function fetchListingDetail(id) {
  const res = await fetch(`${API_BASE}/listings/${id}`);
  return res.json();
}

export async function fetchListingMetrics(id, num_months = 60) {
  const res = await fetch(`${API_BASE}/listings/${id}/metrics?num_months=${num_months}`);
  return res.json();
}

export async function fetchListingComps(id) {
  const res = await fetch(`${API_BASE}/listings/${id}/comparable`);
  return res.json();
}

export async function fetchListingFutureRates(id) {
  const res = await fetch(`${API_BASE}/listings/${id}/future-rates`);
  return res.json();
}

export async function fetchListingsBatch(ids) {
  const res = await fetch(`${API_BASE}/listings/batch`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  });
  return res.json();
}

export async function searchListingsByRadius({ lat, lng, radius_miles = 5, filter, sort, pagination }) {
  const res = await fetch(`${API_BASE}/listings/search/radius`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lng, radius_miles, filter, sort, pagination })
  });
  return res.json();
}

export async function searchListingsByPolygon({ polygon, filter, sort, pagination }) {
  const res = await fetch(`${API_BASE}/listings/search/polygon`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ polygon, filter, sort, pagination })
  });
  return res.json();
}

export async function searchListingsByMarket({ market, filter, sort, pagination }) {
  const res = await fetch(`${API_BASE}/listings/search/market`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ market, filter, sort, pagination })
  });
  return res.json();
}
