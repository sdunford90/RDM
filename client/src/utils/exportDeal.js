import { formatCurrency, formatPercent, formatNumber } from './formatters';

export function exportDealSummary({ asset, parcelData, marketData, underwriting }) {
  if (!asset?.address) return;

  const p = parcelData || {};
  const m = marketData || {};
  const u = underwriting || {};
  const est = m.estimate || {};
  const sum = m.summary || {};

  // Compute underwriting totals
  const slipRev = (u.slipCategories || []).reduce((t, s) => {
    const months = s.seasonal ? (s.activeMonths || 6) : 12;
    return t + (s.count || 0) * (s.monthlyRate || 0) * ((s.occupancy || 0) / 100) * months;
  }, 0);
  const strRev = (u.strUnits || []).reduce((t, s) =>
    t + (s.count || 0) * (s.adr || 0) * ((s.occupancy || 0) / 100) * (s.availableNights || 365), 0);
  const otherRev = (u.otherRevenue || []).reduce((t, r) => t + (r.amount || 0), 0);
  const totalEGR = slipRev + strRev + otherRev;
  const exp = u.expenses || {};
  const mgmtFee = exp.mgmtFeeEnabled ? totalEGR * (exp.mgmtFeePct || 0) / 100 : 0;
  const maint = exp.maintenanceMode === 'percent' ? totalEGR * (exp.maintenancePct || 0) / 100 : (exp.maintenanceFlat || 0);
  const totalOpex = mgmtFee + (exp.propertyTaxes || 0) + (exp.insurance || 0) + (exp.utilities || 0) + maint + (exp.payroll || 0) + (exp.marketing || 0) + (exp.otherOpex || 0);
  const noi = totalEGR - totalOpex;
  const capRate = u.purchasePrice > 0 ? (noi / u.purchasePrice) * 100 : 0;

  const html = `<!DOCTYPE html>
<html>
<head>
<title>${asset.label || asset.address} - Deal Summary</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, sans-serif; color: #1e293b; padding: 40px; max-width: 900px; margin: 0 auto; font-size: 13px; line-height: 1.5; }
  h1 { font-size: 22px; color: #7c3aed; margin-bottom: 4px; }
  h2 { font-size: 14px; color: #7c3aed; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #ede9fe; text-transform: uppercase; letter-spacing: 0.05em; }
  .subtitle { font-size: 12px; color: #64748b; margin-bottom: 20px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f1f5f9; }
  .label { color: #64748b; font-size: 11px; }
  .value { font-weight: 600; font-family: 'JetBrains Mono', monospace; }
  .hero { background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; border-radius: 12px; padding: 20px; margin: 16px 0; text-align: center; }
  .hero .big { font-size: 28px; font-weight: 800; }
  .hero .sub { font-size: 11px; opacity: 0.85; margin-top: 4px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
  .badge-violet { background: #ede9fe; color: #7c3aed; }
  .badge-emerald { background: #d1fae5; color: #059669; }
  .badge-amber { background: #fef3c7; color: #d97706; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
  @media print { body { padding: 20px; } .no-print { display: none; } }
</style>
</head>
<body>
<h1>${asset.label || 'Deal Summary'}</h1>
<p class="subtitle">${asset.address || ''} ${asset.stage ? `<span class="badge badge-violet">${asset.stage}</span>` : ''}</p>

<div class="cols">
<div>
<h2>Property</h2>
${field('APN', p.identity?.parcelnumb)}
${field('Acreage', p.physical?.ll_gisacre ? `${p.physical.ll_gisacre} ac` : null)}
${field('Year Built', p.physical?.yearbuilt)}
${field('Building SF', p.physical?.area_building ? formatNumber(p.physical.area_building) : null)}
${field('Units', p.physical?.numunits)}
${field('Zoning', p.landuse?.zoning)}
${field('Use', p.landuse?.usedesc)}
${field('Flood Zone', p.federal?.fema_flood_zone)}
${p.federal?.qoz ? '<span class="badge badge-emerald">Opportunity Zone</span>' : ''}

<h2>Ownership</h2>
${field('Owner', p.ownership?.owner)}
${field('Type', p.ownership?.owntype)}
${field('Mailing', p.ownership?.mailadd)}
</div>

<div>
<h2>Valuation & Tax</h2>
${field('Assessed Value', p.tax?.parval, formatCurrency)}
${field('Land Value', p.tax?.landval, formatCurrency)}
${field('Improvement', p.tax?.improvval, formatCurrency)}
${field('Tax Bill', p.tax?.taxamt, formatCurrency)}
${field('Last Sale', p.sale?.saleprice, formatCurrency)}
${field('Sale Date', p.sale?.saledate)}

<h2>Market Data</h2>
${field('ADR', sum.adr || est.projected_adr, formatCurrency)}
${field('Occupancy', sum.occupancy || est.projected_occupancy, formatPercent)}
${field('RevPAR', sum.revpar, formatCurrency)}
${field('Monthly Revenue', sum.revenue, formatCurrency)}
${field('Active Listings', sum.active_listings, formatNumber)}
${field('Proj. Annual Revenue', est.projected_annual_revenue, formatCurrency)}
</div>
</div>

${totalEGR > 0 ? `
<div class="hero">
  <div class="big">${formatCurrency(noi)}</div>
  <div class="sub">Net Operating Income</div>
</div>

<h2>Underwriting Summary</h2>
<div class="cols">
<div>
${field('Marina Slip Revenue', slipRev, formatCurrency)}
${field('STR/Lodging Revenue', strRev, formatCurrency)}
${field('Other Revenue', otherRev, formatCurrency)}
${field('Total EGR', totalEGR, formatCurrency)}
</div>
<div>
${field('Total OpEx', totalOpex, formatCurrency)}
${field('Expense Ratio', totalEGR > 0 ? (totalOpex / totalEGR * 100) : 0, v => formatPercent(v))}
${field('NOI', noi, formatCurrency)}
${field('Cap Rate', capRate, v => v.toFixed(2) + '%')}
${u.purchasePrice > 0 ? field('Purchase Price', u.purchasePrice, formatCurrency) : ''}
</div>
</div>
` : ''}

<div class="footer">
  Generated by RDM Deal Tool &bull; ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
</div>

<script>window.print();</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

function field(label, value, fmt) {
  if (value == null || value === '') return '';
  const display = fmt ? fmt(value) : String(value);
  return `<div class="row"><span class="label">${label}</span><span class="value">${display}</span></div>`;
}
