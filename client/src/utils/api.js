const API_BASE = '/api';

export async function fetchMapboxToken() {
  const res = await fetch(`${API_BASE}/mapbox-token`);
  const data = await res.json();
  return data.token;
}

export async function fetchParcelData({ lat, lng, address }) {
  const res = await fetch(`${API_BASE}/parcel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lng, address })
  });
  return res.json();
}

export async function fetchMarketData({ lat, lng, radius_miles = 10 }) {
  const res = await fetch(`${API_BASE}/market`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lng, radius_miles })
  });
  return res.json();
}

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
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(asset)
  });
  return res.json();
}

export async function deleteAsset(id) {
  const res = await fetch(`${API_BASE}/assets/${id}`, {
    method: 'DELETE'
  });
  return res.json();
}
