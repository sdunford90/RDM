const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function saveAsset(asset) {
  const { id, createdAt, updatedAt, ...data } = asset;

  if (id) {
    return prisma.asset.upsert({
      where: { id },
      update: {
        ...data,
        updatedAt: new Date()
      },
      create: {
        id,
        ...data
      }
    });
  }

  return prisma.asset.create({ data });
}

async function getAsset(id) {
  return prisma.asset.findUnique({ where: { id } });
}

async function listAssets() {
  return prisma.asset.findMany({
    select: {
      id: true,
      label: true,
      address: true,
      stage: true,
      notes: true,
      updatedAt: true,
      market: true,
      parcel: true,
      underwriting: true
    },
    orderBy: { updatedAt: 'desc' }
  });
}

async function updateAssetStage(id, stage) {
  return prisma.asset.update({ where: { id }, data: { stage, updatedAt: new Date() } });
}

async function deleteAsset(id) {
  return prisma.asset.delete({ where: { id } });
}

// ─── Market CRUD ───

async function saveMarket(market) {
  const { id, createdAt, updatedAt, ...data } = market;
  return prisma.market.upsert({
    where: { name: data.name },
    update: { ...data, updatedAt: new Date() },
    create: data
  });
}

async function listMarkets() {
  return prisma.market.findMany({
    select: {
      id: true, name: true, lat: true, lng: true,
      adr: true, occupancy: true, revpar: true, monthlyRev: true,
      listings: true, supplyGrowth: true, score: true, updatedAt: true
    },
    orderBy: { score: 'desc' }
  });
}

async function getMarket(id) {
  return prisma.market.findUnique({ where: { id } });
}

async function deleteMarket(id) {
  return prisma.market.delete({ where: { id } });
}

module.exports = { saveAsset, getAsset, listAssets, deleteAsset, updateAssetStage, saveMarket, listMarkets, getMarket, deleteMarket };
