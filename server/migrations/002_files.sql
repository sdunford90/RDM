-- Migration 002: file attachments per marina.
-- Storage backend is abstracted (Replit Object Storage or local disk);
-- this table only holds metadata + the storage key.

CREATE TABLE IF NOT EXISTS files (
  id                TEXT PRIMARY KEY,
  marina_id         TEXT NOT NULL,
  storage_key       TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  content_type      TEXT,
  size_bytes        INTEGER NOT NULL DEFAULT 0,
  file_type         TEXT NOT NULL DEFAULT 'other', -- om|financial|survey|photo|contract|other
  uploaded_by       TEXT,
  uploaded_at       TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (marina_id) REFERENCES marinas(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_files_marina    ON files(marina_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_type      ON files(file_type);
