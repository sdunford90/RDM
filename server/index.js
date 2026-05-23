require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const { getDB } = require('./sqlite');

const parcelRoutes = require('./routes/parcel');
const marketRoutes = require('./routes/market');
const assetRoutes = require('./routes/assets');
const marinaRoutes = require('./routes/marinas');
const authRoutes = require('./routes/auth');
const fileRoutes = require('./routes/files');
const dashboardRoutes = require('./routes/dashboard');
const { requireAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize SQLite (runs migrations + legacy JSON import on first boot).
getDB();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Public endpoints — auth + mapbox token are needed before the user can sign in.
app.use('/api/auth', authRoutes);
app.get('/api/mapbox-token', (req, res) => {
  res.json({ token: process.env.MAPBOX_TOKEN });
});

// Auth-gated endpoints.
app.use('/api/marinas', marinaRoutes);
app.use('/api/parcel', requireAuth, parcelRoutes);
app.use('/api/market', requireAuth, marketRoutes);
app.use('/api/assets', requireAuth, assetRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api', requireAuth, fileRoutes);

// Standalone underwriting calculator — no auth, for export to other apps.
app.get('/underwriting-tool', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'exports', 'underwriting-calculator.html'));
});

// Serve static frontend in production.
const distPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`RDM Deal Tool server running on port ${PORT}`);
  console.log(`Auth mode: ${process.env.GOOGLE_CLIENT_ID ? 'google' : 'dev (set GOOGLE_CLIENT_ID + AUTH_ALLOWLIST to enable Google sign-in)'}`);
});
