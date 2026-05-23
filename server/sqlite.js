const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = process.env.RDM_DB_PATH || path.join(__dirname, 'data.db');
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

let _db = null;

function getDB() {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  runMigrations(_db);
  maybeMigrateLegacyJson(_db);
  return _db;
}

function runMigrations(db) {
  if (!fs.existsSync(MIGRATIONS_DIR)) return;
  const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
  for (const f of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8');
    db.exec(sql);
  }
}

// One-shot import of the old data.json file into the new `assets` table.
function maybeMigrateLegacyJson(db) {
  const legacy = path.join(__dirname, 'data.json');
  if (!fs.existsSync(legacy)) return;
  const marker = path.join(__dirname, '.data.json.migrated');
  if (fs.existsSync(marker)) return;
  try {
    const raw = JSON.parse(fs.readFileSync(legacy, 'utf8'));
    const assets = raw.assets || {};
    const insert = db.prepare(`
      INSERT OR REPLACE INTO assets (id, label, address, lat, lng, parcel, market, underwriting, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))
    `);
    const tx = db.transaction(() => {
      for (const id in assets) {
        const a = assets[id];
        insert.run(
          a.id, a.label || null, a.address || null,
          a.lat || null, a.lng || null,
          a.parcel ? JSON.stringify(a.parcel) : null,
          a.market ? JSON.stringify(a.market) : null,
          a.underwriting ? JSON.stringify(a.underwriting) : null,
          a.notes || null,
          a.createdAt || null, a.updatedAt || null
        );
      }
    });
    tx();
    fs.writeFileSync(marker, new Date().toISOString());
    console.log(`Migrated ${Object.keys(assets).length} legacy assets from data.json into SQLite.`);
  } catch (e) {
    console.error('Legacy JSON migration failed:', e);
  }
}

module.exports = { getDB };
