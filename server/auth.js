const oidc = require('openid-client');
const { Strategy } = require('openid-client/passport');
const passport = require('passport');
const session = require('express-session');
const connectPg = require('connect-pg-simple');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

let oidcConfig = null;

async function getOidcConfig() {
  if (!oidcConfig) {
    oidcConfig = await oidc.discovery(
      new URL(process.env.ISSUER_URL || 'https://replit.com/oidc'),
      process.env.REPL_ID
    );
  }
  return oidcConfig;
}

function getSession() {
  const PgSession = connectPg(session);
  return session({
    secret: process.env.SESSION_SECRET,
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      tableName: 'sessions',
      ttl: 7 * 24 * 60 * 60,
    }),
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: true, maxAge: 7 * 24 * 60 * 60 * 1000 },
  });
}

// Upsert user. First-ever user becomes admin and their email is auto-allowed.
async function upsertUser(claims) {
  const userCount = await prisma.user.count();
  const isFirst = userCount === 0;
  const email = claims.email || null;

  // If email not in AllowedEmail and this isn't the very first user, deny
  if (!isFirst && email) {
    const allowed = await prisma.allowedEmail.findUnique({ where: { email } });
    if (!allowed) return null; // deny
  }

  const user = await prisma.user.upsert({
    where: { id: claims.sub },
    update: {
      email,
      firstName: claims.first_name || null,
      lastName: claims.last_name || null,
      profileImageUrl: claims.profile_image_url || null,
      updatedAt: new Date(),
    },
    create: {
      id: claims.sub,
      email,
      firstName: claims.first_name || null,
      lastName: claims.last_name || null,
      profileImageUrl: claims.profile_image_url || null,
      isAdmin: isFirst,
    },
  });

  // Auto-allow first user's email
  if (isFirst && email) {
    await prisma.allowedEmail.upsert({
      where: { email },
      update: {},
      create: { email, addedBy: 'system (first user)' },
    });
  }

  return user;
}

const registeredStrategies = new Set();

function ensureStrategy(hostname, config) {
  const name = `replitauth:${hostname}`;
  if (!registeredStrategies.has(name)) {
    passport.use(
      new Strategy(
        {
          name,
          config,
          scope: 'openid email profile offline_access',
          callbackURL: `https://${hostname}/api/callback`,
        },
        async (tokens, verified) => {
          try {
            const claims = tokens.claims();
            const user = await upsertUser(claims);
            if (!user) {
              return verified(null, false, { message: 'Access denied. Ask an admin to invite you.' });
            }
            verified(null, { dbUser: user, claims, access_token: tokens.access_token, refresh_token: tokens.refresh_token, expires_at: claims.exp });
          } catch (err) {
            verified(err);
          }
        }
      )
    );
    registeredStrategies.add(name);
  }
}

async function setupAuth(app) {
  app.set('trust proxy', 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user, cb) => cb(null, user));
  passport.deserializeUser((user, cb) => cb(null, user));

  app.get('/api/login', async (req, res, next) => {
    try {
      const config = await getOidcConfig();
      ensureStrategy(req.hostname, config);
      passport.authenticate(`replitauth:${req.hostname}`, {
        prompt: 'login consent',
        scope: ['openid', 'email', 'profile', 'offline_access'],
      })(req, res, next);
    } catch (err) { next(err); }
  });

  app.get('/api/callback', async (req, res, next) => {
    try {
      const config = await getOidcConfig();
      ensureStrategy(req.hostname, config);
      passport.authenticate(`replitauth:${req.hostname}`, {
        successRedirect: '/',
        failureRedirect: '/access-denied',
      })(req, res, next);
    } catch (err) { next(err); }
  });

  app.get('/api/logout', (req, res) => {
    req.logout(async () => {
      try {
        const config = await getOidcConfig();
        const endUrl = oidc.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href;
        res.redirect(endUrl);
      } catch {
        res.redirect('/');
      }
    });
  });

  // Get current user
  app.get('/api/auth/user', isAuthenticated, async (req, res) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user.dbUser.id } });
      res.json(user);
    } catch { res.status(500).json({ error: 'Failed to fetch user' }); }
  });
}

async function isAuthenticated(req, res, next) {
  if (!req.isAuthenticated() || !req.user?.expires_at) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const now = Math.floor(Date.now() / 1000);
  if (now <= req.user.expires_at) return next();

  // Try to refresh
  if (!req.user.refresh_token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const config = await getOidcConfig();
    const tokens = await oidc.refreshTokenGrant(config, req.user.refresh_token);
    const claims = tokens.claims();
    req.user.access_token = tokens.access_token;
    req.user.refresh_token = tokens.refresh_token;
    req.user.expires_at = claims.exp;
    next();
  } catch {
    res.status(401).json({ message: 'Unauthorized' });
  }
}

function isAdmin(req, res, next) {
  if (!req.user?.dbUser?.isAdmin) return res.status(403).json({ message: 'Forbidden' });
  next();
}

// Run at startup: ensure MASTER_ADMIN_EMAIL is always allowed + admin.
// Idempotent — safe to call every boot.
async function seedMasterAdmin() {
  const email = (process.env.MASTER_ADMIN_EMAIL || '').toLowerCase().trim();
  if (!email) return;

  // Ensure the email is in the allowlist
  await prisma.allowedEmail.upsert({
    where: { email },
    update: {},
    create: { email, addedBy: 'system (master admin seed)' },
  });

  // If the user has already signed in, promote them to admin
  const user = await prisma.user.findFirst({ where: { email } });
  if (user && !user.isAdmin) {
    await prisma.user.update({ where: { id: user.id }, data: { isAdmin: true } });
    console.log(`[auth] Promoted ${email} to admin.`);
  } else if (!user) {
    console.log(`[auth] Master admin email ${email} is pre-allowed. They will become admin on first sign-in.`);
  }
}

module.exports = { setupAuth, isAuthenticated, isAdmin, seedMasterAdmin };
