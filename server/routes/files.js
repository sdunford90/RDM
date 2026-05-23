// File attachments for marinas. Backed by the `files` table + storage.js.

const express = require('express');
const multer = require('multer');
const { randomUUID } = require('crypto');
const { getDB } = require('../sqlite');
const { getBackend } = require('../storage');

const router = express.Router({ mergeParams: true });

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB cap
const ALLOWED_TYPES = new Set(['om', 'financial', 'survey', 'photo', 'contract', 'other']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES }
});

function shapeFile(row) {
  return {
    id: row.id,
    marina_id: row.marina_id,
    filename: row.original_filename,
    content_type: row.content_type,
    size_bytes: row.size_bytes,
    file_type: row.file_type,
    uploaded_by: row.uploaded_by,
    uploaded_at: row.uploaded_at
  };
}

// GET /api/marinas/:marinaId/files
router.get('/marinas/:marinaId/files', (req, res) => {
  const db = getDB();
  const rows = db.prepare('SELECT * FROM files WHERE marina_id = ? ORDER BY uploaded_at DESC').all(req.params.marinaId);
  res.json({ files: rows.map(shapeFile) });
});

// POST /api/marinas/:marinaId/files  (multipart, field name = "file")
router.post('/marinas/:marinaId/files', upload.single('file'), async (req, res) => {
  const db = getDB();
  const marina = db.prepare('SELECT id FROM marinas WHERE id = ?').get(req.params.marinaId);
  if (!marina) return res.status(404).json({ error: 'Marina not found' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded (use field name "file")' });

  const fileType = ALLOWED_TYPES.has(req.body.file_type) ? req.body.file_type : 'other';

  try {
    const storage = getBackend();
    const key = await storage.upload(req.file.buffer, req.file.mimetype);

    const id = randomUUID();
    db.prepare(`
      INSERT INTO files (id, marina_id, storage_key, original_filename, content_type, size_bytes, file_type, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.params.marinaId, key, req.file.originalname, req.file.mimetype, req.file.size, fileType, req.user?.id || null);

    db.prepare(`UPDATE marinas SET last_activity_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).run(req.params.marinaId);
    db.prepare(`INSERT INTO activity_log (marina_id, user_id, action, payload) VALUES (?, ?, 'file_upload', ?)`)
      .run(req.params.marinaId, req.user?.id || null, JSON.stringify({ filename: req.file.originalname, file_type: fileType }));

    const row = db.prepare('SELECT * FROM files WHERE id = ?').get(id);
    res.status(201).json(shapeFile(row));
  } catch (e) {
    console.error('File upload failed:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/files/:id/download  → streams the file contents
router.get('/files/:id/download', async (req, res) => {
  const db = getDB();
  const row = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'File not found' });

  try {
    const storage = getBackend();
    const buf = await storage.download(row.storage_key);
    res.setHeader('Content-Type', row.content_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(row.original_filename)}"`);
    res.setHeader('Content-Length', buf.length);
    res.send(buf);
  } catch (e) {
    console.error('File download failed:', e);
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/files/:id
router.delete('/files/:id', async (req, res) => {
  const db = getDB();
  const row = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'File not found' });

  try {
    const storage = getBackend();
    await storage.delete(row.storage_key);
    db.prepare('DELETE FROM files WHERE id = ?').run(req.params.id);
    db.prepare(`INSERT INTO activity_log (marina_id, user_id, action, payload) VALUES (?, ?, 'file_delete', ?)`)
      .run(row.marina_id, req.user?.id || null, JSON.stringify({ filename: row.original_filename }));
    res.status(204).end();
  } catch (e) {
    console.error('File delete failed:', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
