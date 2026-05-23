// Deterministic fit-score for a marina record straight out of the marinas.com JSON.
// No API calls; pure function of the input. Total clamps to [0, 100].
//
// Every component is returned in the breakdown so the UI can show the "why" and
// the formula can be tuned without re-importing the dataset.

const PUBLIC_OPERATORS = new Set([
  'Town', 'Municipal', 'State', 'Public', 'Harbormaster', 'Gov (description)', 'County'
]);

function scoreMarina(m) {
  const breakdown = {};

  // Operator type — private acquirables are the point of the exercise.
  if (m.is_public === false && !PUBLIC_OPERATORS.has(m.operator_type)) {
    breakdown.private_operator = 25;
  } else if (m.is_public === false) {
    breakdown.private_operator = 10;
  } else {
    breakdown.private_operator = 0;
  }

  // Slip count — log-scaled, sweet spot 30-300.
  const slips = Number(m.slips) || 0;
  if (slips >= 30) {
    const capped = Math.min(slips, 300);
    breakdown.slips = Math.round((Math.log10(capped) - Math.log10(30)) / (Math.log10(300) - Math.log10(30)) * 20);
  } else if (slips >= 10) {
    breakdown.slips = Math.round((slips - 10) / 20 * 8); // 0-8
  } else {
    breakdown.slips = 0;
  }

  // Hotel market tier — the JSON already grades the lodging market.
  const tier = m.hotel_market?.tier;
  breakdown.market_tier =
    tier === 'A' ? 20 :
    tier === 'B' ? 12 :
    tier === 'C' ? 5  : 0;

  // Demand score 0-100 from the JSON, normalized to 0-15.
  const demand = Number(m.hotel_market?.demand_score) || 0;
  breakdown.demand_score = Math.round((Math.max(0, Math.min(100, demand)) / 100) * 15);

  // Max LOA — bigger boats mean wealthier clientele, deeper draft = barriers to new entry.
  const loa = Number(m.max_loa) || 0;
  if (loa >= 100) breakdown.max_loa = 8;
  else if (loa >= 60) breakdown.max_loa = 5;
  else if (loa >= 40) breakdown.max_loa = 2;
  else breakdown.max_loa = 0;

  // Fuel dock — small operational moat.
  breakdown.fuel_dock = m.has_fuel_dock ? 4 : 0;

  // Amenity count — modest signal of full-service vs basic.
  const amenityCount = Number(m.amenity_count) || 0;
  breakdown.amenities = Math.min(amenityCount, 8);

  // Moorings or linear_ft — present when slips are missing or sparse, gives partial credit.
  const moorings = Number(m.moorings) || 0;
  const linear   = Number(m.linear_ft) || 0;
  breakdown.aux_capacity = Math.min(3, Math.round((moorings / 50) + (linear / 1000)));

  // Discount if hotel_market data confidence is low — don't reward unreliable signals.
  const confidence = m.hotel_market?.data_confidence;
  if (confidence === 'low') {
    breakdown.confidence_penalty = -5;
  } else {
    breakdown.confidence_penalty = 0;
  }

  // Sum and clamp.
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const fit_score = Math.max(0, Math.min(100, total));
  return { fit_score, breakdown };
}

module.exports = { scoreMarina };
