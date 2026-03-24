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
      updatedAt: true
    },
    orderBy: { updatedAt: 'desc' }
  });
}

async function deleteAsset(id) {
  return prisma.asset.delete({ where: { id } });
}

module.exports = { saveAsset, getAsset, listAssets, deleteAsset };
