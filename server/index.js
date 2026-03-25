require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');

const { setupAuth, isAuthenticated, seedMasterAdmin } = require('./auth');
const parcelRoutes = require('./routes/parcel');
const marketRoutes = require('./routes/market');
const listingRoutes = require('./routes/listings');
const assetRoutes = require('./routes/assets');
const adminRoutes = require('./routes/admin');
const sheetsRoutes = require('./routes/sheets');
const marketsRoutes = require('./routes/markets');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Auth MUST be set up before all other routes
setupAuth(app).then(async () => {
  // Seed master admin from env var (idempotent — safe every boot)
  await seedMasterAdmin().catch(err => console.warn('[auth] seedMasterAdmin failed:', err));
  // Protected API routes
  app.use('/api/parcel', isAuthenticated, parcelRoutes);
  app.use('/api/market', isAuthenticated, marketRoutes);
  app.use('/api/listings', isAuthenticated, listingRoutes);
  app.use('/api/assets', isAuthenticated, assetRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/sheets', isAuthenticated, sheetsRoutes);
  app.use('/api/markets', isAuthenticated, marketsRoutes);

  // Mapbox token — public (needed before login to render the map on the login page)
  app.get('/api/mapbox-token', (req, res) => {
    res.json({ token: process.env.MAPBOX_TOKEN });
  });

  // Serve static frontend in production
  const distPath = path.join(__dirname, '..', 'client', 'dist');
  const fs = require('fs');
  if (fs.existsSync(path.join(distPath, 'index.html'))) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RDM Deal Tool server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to set up auth:', err);
  process.exit(1);
});
