// Composite market score (0-100) for ranking STR markets
// Weights: occupancy 30%, ADR 25%, RevPAR 20%, supply growth (inverse) 15%, listing density 10%

function normalize(value, min, max) {
  if (value == null) return 50; // neutral if missing
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

function calculateMarketScore({ adr, occupancy, revpar, supplyGrowth, listings }) {
  // ADR: $50-$500 range
  const adrScore = normalize(adr, 50, 500);

  // Occupancy: 20-90% range
  const occScore = normalize(occupancy, 20, 90);

  // RevPAR: $20-$300 range
  const revparScore = normalize(revpar, 20, 300);

  // Supply growth: LOWER is better (less competition). Range: -10% to +30%
  // Invert: -10% growth = score 100, +30% growth = score 0
  const supplyScore = 100 - normalize(supplyGrowth, -10, 30);

  // Listings: moderate is ideal. Too few = no demand, too many = saturated
  // Bell curve around 200-800 listings being ideal
  let listingScore = 50;
  if (listings != null) {
    if (listings < 50) listingScore = normalize(listings, 0, 50) * 0.7;
    else if (listings <= 800) listingScore = 70 + normalize(listings, 50, 800) * 0.3;
    else listingScore = 100 - normalize(listings, 800, 3000) * 0.4;
  }

  const composite = (
    occScore * 0.30 +
    adrScore * 0.25 +
    revparScore * 0.20 +
    supplyScore * 0.15 +
    listingScore * 0.10
  );

  return Math.round(composite * 10) / 10;
}

module.exports = { calculateMarketScore };
