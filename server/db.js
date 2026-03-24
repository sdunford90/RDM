const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, 'data.json');

function readDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('DB read error:', e);
  }
  return { assets: {}, asset_index: [] };
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

async function saveAsset(asset) {
  const db = readDB();
  if (!asset.id) asset.id = uuidv4();
  if (!asset.createdAt) asset.createdAt = new Date().toISOString();
  asset.updatedAt = new Date().toISOString();

  db.assets[asset.id] = asset;

  const entry = {
    id: asset.id,
    label: asset.label || '',
    address: asset.address || '',
    updatedAt: asset.updatedAt
  };
  const idx = db.asset_index.findIndex(a => a.id === asset.id);
  if (idx >= 0) db.asset_index[idx] = entry;
  else db.asset_index.push(entry);

  writeDB(db);
  return asset;
}

async function getAsset(id) {
  const db = readDB();
  return db.assets[id] || null;
}

async function listAssets() {
  const db = readDB();
  return db.asset_index;
}

async function deleteAsset(id) {
  const db = readDB();
  delete db.assets[id];
  db.asset_index = db.asset_index.filter(a => a.id !== id);
  writeDB(db);
}

module.exports = { saveAsset, getAsset, listAssets, deleteAsset };
