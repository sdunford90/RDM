// Google sign-in + session management.
// Falls back to a permissive dev mode when GOOGLE_CLIENT_ID is not set.

const express = require('express');
const crypto = require('crypto');
const { getDB } = require('../sqlite');
const { authMode, getUserFromRequest, DEV_USER } = require('../middleware/auth');

const router = express.Router();

const SESSION_DAYS = 30;

function allowlist() {
  const raw = process.env.AUTH_ALLOWLIST || '';
  return new Set(raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
}

// GET /api/me — current session info.
router.get('/me', (req, res) => {
  const user = getUserFromRequest(req);
  res.json({
    user: user || null,
    mode: authMode(),
    google_client_id: process.env.GOOGLE_CLIENT_ID || null,
    allowlist_size: allowlist().size
  });
});

// POST /api/auth/google { credential } — verify Google ID token, create session.
router.post('/google', async (req, res) => {
  if (authMode() === 'dev') {
    return res.status(400).json({ error: 'Google auth disabled (set GOOGLE_CLIENT_ID env var to enable)' });
  }
  const { credential } = req.body || {};
  if (!credential) return res.status(400).json({ error: 'Missing credential' });

  try {
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const email = (payload.email || '').toLowerCase();
    if (!email) return res.status(400).json({ error: 'No email in Google token' });

    const list = allowlist();
    const allowed = list.size === 0 ? false : list.has(email);
    if (!allowed) {
      return res.status(403).json({ error: 'Email not on the allowlist', email });
    }

    const db = getDB();
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      const id = `u_${payload.sub}`;
      db.prepare(`
        INSERT INTO users (id, google_sub, email, name, picture, is_allowed, last_seen_at)
        VALUES (?, ?, ?, ?, ?, 1, datetime('now'))
      `).run(id, payload.sub, email, payload.name || email, payload.picture || null);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    } else {
      db.prepare(`UPDATE users SET name = ?, picture = ?, last_seen_at = datetime('now') WHERE id = ?`)
        .run(payload.name || user.name, payload.picture || user.picture, user.id);
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000).toISOString();
    db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, user.id, expires);
    db.prepare('INSERT INTO activity_log (user_id, action, payload) VALUES (?, ?, ?)')
      .run(user.id, 'login', JSON.stringify({ email }));

    res.cookie('rdm_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: req.protocol === 'https',
      maxAge: SESSION_DAYS * 24 * 3600 * 1000
    });
    res.json({ user });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(401).json({ error: 'Google token verification failed' });
  }
});

// POST /api/auth/logout — invalidate session.
router.post('/logout', (req, res) => {
  const token = req.cookies?.rdm_session;
  if (token) {
    getDB().prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }
  res.clearCookie('rdm_session');
  res.json({ ok: true });
});

module.exports = router;
