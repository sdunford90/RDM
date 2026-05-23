// SQLite-backed implementation of the original JSON-file db API.
// Existing callers (server/routes/assets.js) keep working unchanged.

const { v4: uuidv4 } = require('uuid');
const { getDB } = require('./sqlite');

function row2asset(row) {
  if (!row) return null;
  return {
    id: row.id,
    marinaId: row.marina_id || null,
    label: row.label || '',
    address: row.address || '',
    lat: row.lat,
    lng: row.lng,
    parcel: row.parcel ? JSON.parse(row.parcel) : null,
    market: row.market ? JSON.parse(row.market) : null,
    underwriting: row.underwriting ? JSON.parse(row.underwriting) : null,
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function saveAsset(asset) {
  const db = getDB();
  const id = asset.id || uuidv4();
  const now = new Date().toISOString();
  const existing = db.prepare('SELECT id FROM assets WHERE id = ?').get(id);
  if (existing) {
    db.prepare(`
      UPDATE assets
      SET label = ?, address = ?, lat = ?, lng = ?,
          parcel = ?, market = ?, underwriting = ?, notes = ?,
          marina_id = COALESCE(?, marina_id),
          updated_at = ?
      WHERE id = ?
    `).run(
      asset.label || '',
      asset.address || '',
      asset.lat ?? null,
      asset.lng ?? null,
      asset.parcel ? JSON.stringify(asset.parcel) : null,
      asset.market ? JSON.stringify(asset.market) : null,
      asset.underwriting ? JSON.stringify(asset.underwriting) : null,
      asset.notes || '',
      asset.marinaId || null,
      now,
      id
    );
  } else {
    db.prepare(`
      INSERT INTO assets (id, marina_id, label, address, lat, lng, parcel, market, underwriting, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      asset.marinaId || null,
      asset.label || '',
      asset.address || '',
      asset.lat ?? null,
      asset.lng ?? null,
      asset.parcel ? JSON.stringify(asset.parcel) : null,
      asset.market ? JSON.stringify(asset.market) : null,
      asset.underwriting ? JSON.stringify(asset.underwriting) : null,
      asset.notes || '',
      asset.createdAt || now,
      now
    );
  }
  return getAsset(id);
}

async function getAsset(id) {
  const db = getDB();
  return row2asset(db.prepare('SELECT * FROM assets WHERE id = ?').get(id));
}

async function getAssetByMarinaId(marinaId) {
  const db = getDB();
  return row2asset(db.prepare('SELECT * FROM assets WHERE marina_id = ? ORDER BY updated_at DESC LIMIT 1').get(marinaId));
}

async function listAssets() {
  const db = getDB();
  const rows = db.prepare(`
    SELECT id, label, address, updated_at AS updatedAt
    FROM assets
    ORDER BY updated_at DESC
  `).all();
  return rows;
}

async function deleteAsset(id) {
  const db = getDB();
  db.prepare('DELETE FROM assets WHERE id = ?').run(id);
}

module.exports = { saveAsset, getAsset, getAssetByMarinaId, listAssets, deleteAsset };
