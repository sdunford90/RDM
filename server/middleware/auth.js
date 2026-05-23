// Session-cookie auth middleware.
//
// Two modes:
//   - If GOOGLE_CLIENT_ID is set, Google ID tokens (verified in routes/auth.js)
//     mint a session token written to the `sessions` table.
//   - If GOOGLE_CLIENT_ID is unset (dev / first-boot), a permissive dev user is
//     attached to every request so the UI is usable without setup. Surface this
//     to the client via GET /api/me so the UI can label it clearly.

const { getDB } = require('../sqlite');

const DEV_USER = {
  id: 'dev-user',
  email: 'dev@local',
  name: 'Local Dev',
  picture: null,
  is_allowed: 1,
  isDev: true
};

function ensureDevUser() {
  const db = getDB();
  db.prepare(`
    INSERT OR IGNORE INTO users (id, email, name, is_allowed)
    VALUES (?, ?, ?, 1)
  `).run(DEV_USER.id, DEV_USER.email, DEV_USER.name);
}

function authMode() {
  return process.env.GOOGLE_CLIENT_ID ? 'google' : 'dev';
}

function getUserFromRequest(req) {
  if (authMode() === 'dev') {
    ensureDevUser();
    return DEV_USER;
  }
  const token = req.cookies?.rdm_session;
  if (!token) return null;
  const db = getDB();
  const row = db.prepare(`
    SELECT u.id, u.email, u.name, u.picture, u.is_allowed, s.expires_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > datetime('now')
  `).get(token);
  if (!row || !row.is_allowed) return null;
  return row;
}

function requireAuth(req, res, next) {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  req.user = user;
  next();
}

module.exports = { requireAuth, getUserFromRequest, authMode, DEV_USER };
