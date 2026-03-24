#!/bin/bash
set -e

echo "==> Installing root dependencies..."
npm install

echo "==> Installing client dependencies..."
cd client
npm install

echo "==> Building client..."
npx vite build

echo "==> Build complete."
