require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');

const parcelRoutes = require('./routes/parcel');
const marketRoutes = require('./routes/market');
const listingRoutes = require('./routes/listings');
const assetRoutes = require('./routes/assets');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/parcel', parcelRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/assets', assetRoutes);

// Mapbox token endpoint (so frontend never has the raw env var)
app.get('/api/mapbox-token', (req, res) => {
  res.json({ token: process.env.MAPBOX_TOKEN });
});

// Serve static frontend in production
const distPath = path.join(__dirname, '..', 'client', 'dist');
const fs = require('fs');
if (fs.existsSync(path.join(distPath, 'index.html'))) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`RDM Deal Tool server running on port ${PORT}`);
});
