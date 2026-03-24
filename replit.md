# RDM Deal Tool

## Overview
A real estate deal analysis tool with a React + Vite frontend and an Express.js backend. It allows users to analyze parcels, market data, and manage real estate assets.

## Architecture
- **Frontend**: React 18 + Vite, Tailwind CSS, Mapbox GL, Chart.js — runs on port 5000
- **Backend**: Express.js Node server — runs on port 3000
- **Database**: File-based JSON storage (`server/data.json`)

## Project Structure
```
/
├── client/          # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   └── utils/
│   └── vite.config.js
├── server/          # Express backend
│   ├── index.js     # Entry point, port 3000
│   ├── db.js        # File-based JSON DB
│   ├── routes/
│   │   ├── assets.js
│   │   ├── market.js
│   │   └── parcel.js
│   └── data.json    # Persistent data store
└── package.json     # Root with concurrently dev script
```

## Running the App
- **Development**: `npm run dev` (runs both client and server via concurrently)
- **Frontend only**: `npm run dev:client`
- **Backend only**: `npm run dev:server`

## Key Configuration
- Vite proxy: `/api` requests proxy to `http://localhost:3000`
- Mapbox token served via `/api/mapbox-token` endpoint (requires `MAPBOX_TOKEN` env var)
- Server reads `.env` from the project root

## Environment Variables
- `MAPBOX_TOKEN` — Mapbox API token for map rendering
- `PORT` — Backend port (defaults to 3000)

## Deployment
- Target: VM (always-running, file-based state)
- Build: `cd client && npm install && npx vite build`
- Run: `node server/index.js` (serves static frontend from `client/dist`)
