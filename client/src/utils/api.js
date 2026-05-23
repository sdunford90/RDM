const API_BASE = '/api';

async function req(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts
  });
  let body;
  try { body = await res.json(); } catch { body = null; }
  if (!res.ok) {
    const err = new Error((body && body.error) || res.statusText);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

// --- Mapbox token (public) ---
export async function fetchMapboxToken() {
  const data = await req('/mapbox-token');
  return data.token;
}

// --- Auth ---
export const fetchMe          = ()        => req('/auth/me');
export const signInWithGoogle = (credential) => req('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) });
export const signOut          = ()        => req('/auth/logout', { method: 'POST' });

// --- Marinas ---
export function listMarinas(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') q.set(k, v); });
  return req(`/marinas?${q.toString()}`);
}
export const fetchMarinaStats = ()      => req('/marinas/stats');
export const fetchMarina      = (id)    => req(`/marinas/${id}`);
export const updateMarina     = (id, patch) => req(`/marinas/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
export const enrichMarina     = (id, { force = false } = {}) =>
  req(`/marinas/${id}/enrich${force ? '?force=1' : ''}`, { method: 'POST' });

// --- Legacy underwriting assets ---
export const listAssets   = ()    => req('/assets');
export const getAsset     = (id)  => req(`/assets/${id}`);
export const saveAsset    = (a)   => req('/assets', { method: 'POST', body: JSON.stringify(a) });
export const deleteAsset  = (id)  => req(`/assets/${id}`, { method: 'DELETE' });

// --- Per-asset enrichment (used by TargetOverview) ---
export const fetchParcelData = ({ lat, lng, address }) =>
  req('/parcel', { method: 'POST', body: JSON.stringify({ lat, lng, address }) });
export const fetchMarketData = ({ lat, lng, radius_miles = 10 }) =>
  req('/market', { method: 'POST', body: JSON.stringify({ lat, lng, radius_miles }) });
