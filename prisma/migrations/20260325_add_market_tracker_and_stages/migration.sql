-- Add stage and marketId to Asset
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "stage" TEXT NOT NULL DEFAULT 'lead';
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "marketId" TEXT;

-- Create Market table
CREATE TABLE IF NOT EXISTS "Market" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "adr" DOUBLE PRECISION,
    "occupancy" DOUBLE PRECISION,
    "revpar" DOUBLE PRECISION,
    "monthlyRev" DOUBLE PRECISION,
    "listings" INTEGER,
    "supplyGrowth" DOUBLE PRECISION,
    "score" DOUBLE PRECISION,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on market name
CREATE UNIQUE INDEX IF NOT EXISTS "Market_name_key" ON "Market"("name");

-- Foreign key from Asset to Market
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_marketId_fkey"
    FOREIGN KEY ("marketId") REFERENCES "Market"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
