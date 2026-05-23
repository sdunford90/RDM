-- RDM marina pipeline schema (v1)
-- Idempotent: safe to run on a fresh db; existing-asset migration handled in code.

CREATE TABLE IF NOT EXISTS marinas (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  city                TEXT,
  state               TEXT,
  region              TEXT,
  address             TEXT,
  lat                 REAL,
  lon                 REAL,
  phone               TEXT,
  vhf                 TEXT,
  website             TEXT,
  harbor              TEXT,
  is_public           INTEGER,
  operator_type       TEXT,
  operator_confidence TEXT,
  reviews             INTEGER,
  slips               INTEGER,
  moorings            INTEGER,
  linear_ft           REAL,
  max_loa             REAL,
  max_slip_length     REAL,
  max_slip_width      REAL,
  approach_depth      REAL,
  dock_depth          REAL,
  has_fuel_dock       INTEGER,
  diesel              INTEGER,
  gas                 INTEGER,
  gas_type            TEXT,
  fuel_updated        TEXT,
  amenities           TEXT,     -- JSON array
  amenity_count       INTEGER,
  dockage_rates       TEXT,     -- JSON
  about               TEXT,
  hotel_market        TEXT,     -- JSON object
  source_url          TEXT,
  scraped_at          TEXT,

  -- Pipeline / review columns
  stage               TEXT NOT NULL DEFAULT 'new',  -- new|reviewing|interested|researching|loi|under_contract|closed|passed
  stage_changed_at    TEXT,
  stage_changed_by    TEXT,                          -- user id
  fit_score           INTEGER NOT NULL DEFAULT 0,
  fit_score_breakdown TEXT,                          -- JSON {component: points}
  notes               TEXT,
  enrichment_status   TEXT NOT NULL DEFAULT 'none', -- none|running|complete|failed
  enriched_at         TEXT,
  last_activity_at    TEXT,

  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_marinas_stage          ON marinas(stage);
CREATE INDEX IF NOT EXISTS idx_marinas_fit_score      ON marinas(fit_score DESC);
CREATE INDEX IF NOT EXISTS idx_marinas_state          ON marinas(state);
CREATE INDEX IF NOT EXISTS idx_marinas_region         ON marinas(region);
CREATE INDEX IF NOT EXISTS idx_marinas_operator_type  ON marinas(operator_type);
CREATE INDEX IF NOT EXISTS idx_marinas_last_activity  ON marinas(last_activity_at DESC);

CREATE TABLE IF NOT EXISTS enrichments (
  marina_id          TEXT NOT NULL,
  source             TEXT NOT NULL,  -- regrid|airdna|airroi|valuation
  data               TEXT NOT NULL,  -- JSON
  fetched_at         TEXT NOT NULL,
  cost_estimate_cents INTEGER,
  status             TEXT NOT NULL DEFAULT 'ok',  -- ok|error|skipped
  error_message      TEXT,
  PRIMARY KEY (marina_id, source),
  FOREIGN KEY (marina_id) REFERENCES marinas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  google_sub  TEXT UNIQUE,
  email       TEXT UNIQUE NOT NULL,
  name        TEXT,
  picture     TEXT,
  is_allowed  INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  marina_id   TEXT,
  user_id     TEXT,
  action      TEXT NOT NULL,  -- stage_change|note|enrich|underwrite_open|login
  payload     TEXT,           -- JSON
  at          TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (marina_id) REFERENCES marinas(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_at        ON activity_log(at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_marina    ON activity_log(marina_id, at DESC);

-- Legacy underwriting assets (kept for backward compatibility)
CREATE TABLE IF NOT EXISTS assets (
  id          TEXT PRIMARY KEY,
  marina_id   TEXT,                       -- nullable; links a deep-dive back to its pipeline row
  label       TEXT,
  address     TEXT,
  lat         REAL,
  lng         REAL,
  parcel      TEXT,    -- JSON
  market      TEXT,    -- JSON
  underwriting TEXT,   -- JSON
  notes       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (marina_id) REFERENCES marinas(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_assets_marina  ON assets(marina_id);
CREATE INDEX IF NOT EXISTS idx_assets_updated ON assets(updated_at DESC);
