#!/usr/bin/env node
// Bulk-import the marinas.com JSON dump into SQLite, computing fit_score on the way in.
// Re-runnable: UPSERTs on id and never clobbers stage/notes/activity columns.
// Zero outbound API calls.
//
// Usage:
//   node server/scripts/import-marinas.js <path-to-json>

const fs = require('fs');
const path = require('path');
const { getDB } = require('../sqlite');
const { scoreMarina } = require('../scoring');

function arg(name, fallback) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : fallback;
}

function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node server/scripts/import-marinas.js <path-to-json>');
    process.exit(1);
  }
  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) {
    console.error('File not found:', abs);
    process.exit(1);
  }

  console.log(`Reading ${abs} ...`);
  const raw = JSON.parse(fs.readFileSync(abs, 'utf8'));
  const records = Array.isArray(raw) ? raw : (raw.marinas || []);
  console.log(`Parsed ${records.length} marina records.`);

  const db = getDB();

  // Preserves any reviewer-touched fields on re-import.
  const stmt = db.prepare(`
    INSERT INTO marinas (
      id, name, city, state, region, address, lat, lon, phone, vhf, website, harbor,
      is_public, operator_type, operator_confidence, reviews, slips, moorings, linear_ft,
      max_loa, max_slip_length, max_slip_width, approach_depth, dock_depth,
      has_fuel_dock, diesel, gas, gas_type, fuel_updated,
      amenities, amenity_count, dockage_rates, about, hotel_market, source_url, scraped_at,
      fit_score, fit_score_breakdown,
      stage, enrichment_status, created_at, updated_at
    ) VALUES (
      @id, @name, @city, @state, @region, @address, @lat, @lon, @phone, @vhf, @website, @harbor,
      @is_public, @operator_type, @operator_confidence, @reviews, @slips, @moorings, @linear_ft,
      @max_loa, @max_slip_length, @max_slip_width, @approach_depth, @dock_depth,
      @has_fuel_dock, @diesel, @gas, @gas_type, @fuel_updated,
      @amenities, @amenity_count, @dockage_rates, @about, @hotel_market, @source_url, @scraped_at,
      @fit_score, @fit_score_breakdown,
      'new', 'none', datetime('now'), datetime('now')
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      city = excluded.city,
      state = excluded.state,
      region = excluded.region,
      address = excluded.address,
      lat = excluded.lat,
      lon = excluded.lon,
      phone = excluded.phone,
      vhf = excluded.vhf,
      website = excluded.website,
      harbor = excluded.harbor,
      is_public = excluded.is_public,
      operator_type = excluded.operator_type,
      operator_confidence = excluded.operator_confidence,
      reviews = excluded.reviews,
      slips = excluded.slips,
      moorings = excluded.moorings,
      linear_ft = excluded.linear_ft,
      max_loa = excluded.max_loa,
      max_slip_length = excluded.max_slip_length,
      max_slip_width = excluded.max_slip_width,
      approach_depth = excluded.approach_depth,
      dock_depth = excluded.dock_depth,
      has_fuel_dock = excluded.has_fuel_dock,
      diesel = excluded.diesel,
      gas = excluded.gas,
      gas_type = excluded.gas_type,
      fuel_updated = excluded.fuel_updated,
      amenities = excluded.amenities,
      amenity_count = excluded.amenity_count,
      dockage_rates = excluded.dockage_rates,
      about = excluded.about,
      hotel_market = excluded.hotel_market,
      source_url = excluded.source_url,
      scraped_at = excluded.scraped_at,
      fit_score = excluded.fit_score,
      fit_score_breakdown = excluded.fit_score_breakdown,
      updated_at = datetime('now')
  `);

  const boolToInt = v => v === true ? 1 : v === false ? 0 : null;

  let inserted = 0;
  let skipped = 0;
  const t0 = Date.now();

  const tx = db.transaction((rows) => {
    for (const m of rows) {
      if (!m.id || !m.name) { skipped++; continue; }
      const { fit_score, breakdown } = scoreMarina(m);
      stmt.run({
        id: m.id,
        name: m.name,
        city: m.city || null,
        state: m.state || null,
        region: m.region || null,
        address: m.address || null,
        lat: m.lat ?? null,
        lon: m.lon ?? null,
        phone: m.phone || null,
        vhf: m.vhf || null,
        website: m.website || null,
        harbor: m.harbor || null,
        is_public: boolToInt(m.is_public),
        operator_type: m.operator_type || null,
        operator_confidence: m.operator_confidence || null,
        reviews: m.reviews ?? null,
        slips: m.slips ?? null,
        moorings: m.moorings ?? null,
        linear_ft: m.linear_ft ?? null,
        max_loa: m.max_loa ?? null,
        max_slip_length: m.max_slip_length ?? null,
        max_slip_width: m.max_slip_width ?? null,
        approach_depth: m.approach_depth ?? null,
        dock_depth: m.dock_depth ?? null,
        has_fuel_dock: boolToInt(m.has_fuel_dock),
        diesel: boolToInt(m.diesel),
        gas: boolToInt(m.gas),
        gas_type: m.gas_type || null,
        fuel_updated: m.fuel_updated || null,
        amenities: m.amenities ? JSON.stringify(m.amenities) : null,
        amenity_count: m.amenity_count ?? null,
        dockage_rates: m.dockage_rates ? JSON.stringify(m.dockage_rates) : null,
        about: m.about || null,
        hotel_market: m.hotel_market ? JSON.stringify(m.hotel_market) : null,
        source_url: m.source_url || null,
        scraped_at: m.scraped_at || null,
        fit_score,
        fit_score_breakdown: JSON.stringify(breakdown)
      });
      inserted++;
    }
  });

  tx(records);

  const dt = ((Date.now() - t0) / 1000).toFixed(2);
  const stats = db.prepare(`
    SELECT COUNT(*) AS total,
           MIN(fit_score) AS min_s,
           MAX(fit_score) AS max_s,
           ROUND(AVG(fit_score), 1) AS avg_s
    FROM marinas
  `).get();

  console.log(`Done in ${dt}s — inserted/updated: ${inserted}, skipped (missing id/name): ${skipped}`);
  console.log(`Marinas in db: ${stats.total} | fit_score min=${stats.min_s} avg=${stats.avg_s} max=${stats.max_s}`);
}

main();
