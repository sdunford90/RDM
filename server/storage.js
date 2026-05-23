// Storage abstraction. Replit Object Storage in production (or anywhere
// REPLIT_OBJECT_STORAGE_BUCKET_ID is set); local disk fallback for dev.
//
// We keep the interface minimal — uploads take a Buffer, downloads return
// a Buffer, and the storage key is opaque to callers.

const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const LOCAL_DIR = process.env.RDM_LOCAL_FILES_DIR || path.join(__dirname, 'data', 'files');

let backend = null;

function getBackend() {
  if (backend) return backend;
  const bucketId = process.env.REPLIT_OBJECT_STORAGE_BUCKET_ID || process.env.REPLIT_DB_URL;
  if (bucketId) {
    try {
      const { Client } = require('@replit/object-storage');
      const client = new Client();
      backend = makeReplitBackend(client);
      console.log('[storage] Using Replit Object Storage');
      return backend;
    } catch (e) {
      console.warn('[storage] @replit/object-storage available but client failed; falling back to local disk:', e.message);
    }
  }
  fs.mkdirSync(LOCAL_DIR, { recursive: true });
  backend = makeLocalBackend(LOCAL_DIR);
  console.log(`[storage] Using local disk at ${LOCAL_DIR}`);
  return backend;
}

function makeReplitBackend(client) {
  return {
    kind: 'replit',
    async upload(buffer, contentType) {
      const key = `marinas/${randomUUID()}`;
      const { ok, error } = await client.uploadFromBytes(key, buffer);
      if (!ok) throw new Error(`Replit upload failed: ${error?.message || 'unknown'}`);
      return key;
    },
    async download(key) {
      const { ok, value, error } = await client.downloadAsBytes(key);
      if (!ok) throw new Error(`Replit download failed: ${error?.message || 'unknown'}`);
      return Buffer.isBuffer(value) ? value : Buffer.from(value);
    },
    async delete(key) {
      const { ok, error } = await client.delete(key);
      if (!ok && error?.message && !/not found/i.test(error.message)) {
        throw new Error(`Replit delete failed: ${error.message}`);
      }
    }
  };
}

function makeLocalBackend(dir) {
  return {
    kind: 'local',
    async upload(buffer) {
      const key = randomUUID();
      await fs.promises.writeFile(path.join(dir, key), buffer);
      return key;
    },
    async download(key) {
      return fs.promises.readFile(path.join(dir, key));
    },
    async delete(key) {
      try { await fs.promises.unlink(path.join(dir, key)); }
      catch (e) { if (e.code !== 'ENOENT') throw e; }
    }
  };
}

module.exports = { getBackend };
