import React, { useState, useEffect } from 'react';
import { getAsset } from '../utils/api';
import { formatCurrency, formatPercent, formatNumber } from '../utils/formatters';

const SECTIONS = [
  {
    label: 'Property',
    rows: [
      { label: 'Address', get: a => a?.address },
      { label: 'Acreage', get: a => a?.parcel?.physical?.ll_gisacre ? `${a.parcel.physical.ll_gisacre} ac` : null },
      { label: 'Year Built', get: a => a?.parcel?.physical?.yearbuilt },
      { label: 'Zoning', get: a => a?.parcel?.landuse?.zoning },
      { label: 'Use', get: a => a?.parcel?.landuse?.usedesc },
      { label: 'Structures', get: a => a?.parcel?.physical?.structno },
      { label: 'Units', get: a => a?.parcel?.physical?.numunits },
    ]
  },
  {
    label: 'Ownership',
    rows: [
      { label: 'Owner', get: a => a?.parcel?.ownership?.owner },
      { label: 'Owner Type', get: a => a?.parcel?.ownership?.owntype },
      { label: 'Mailing', get: a => a?.parcel?.ownership?.mailadd },
    ]
  },
  {
    label: 'Financials',
    rows: [
      { label: 'Assessed Value', get: a => a?.parcel?.tax?.parval, fmt: formatCurrency },
      { label: 'Land Value', get: a => a?.parcel?.tax?.landval, fmt: formatCurrency },
      { label: 'Improvement', get: a => a?.parcel?.tax?.improvval, fmt: formatCurrency },
      { label: 'Tax Bill', get: a => a?.parcel?.tax?.taxamt, fmt: formatCurrency },
      { label: 'Last Sale', get: a => a?.parcel?.sale?.saleprice, fmt: formatCurrency },
      { label: 'Sale Date', get: a => a?.parcel?.sale?.saledate },
    ]
  },
  {
    label: 'Market',
    rows: [
      { label: 'ADR', get: a => a?.market?.summary?.adr || a?.market?.estimate?.projected_adr, fmt: formatCurrency },
      { label: 'Occupancy', get: a => a?.market?.summary?.occupancy || a?.market?.estimate?.projected_occupancy, fmt: formatPercent },
      { label: 'RevPAR', get: a => a?.market?.summary?.revpar, fmt: formatCurrency },
      { label: 'Monthly Revenue', get: a => a?.market?.summary?.revenue, fmt: formatCurrency },
      { label: 'Active Listings', get: a => a?.market?.summary?.active_listings, fmt: formatNumber },
      { label: 'Projected Annual', get: a => a?.market?.estimate?.projected_annual_revenue, fmt: formatCurrency },
    ]
  },
  {
    label: 'Underwriting',
    rows: [
      { label: 'Purchase Price', get: a => a?.underwriting?.purchasePrice, fmt: formatCurrency },
      { label: 'Target Cap Rate', get: a => a?.underwriting?.targetCapRate, fmt: v => `${v}%` },
      { label: 'Slip Categories', get: a => a?.underwriting?.slipCategories?.length },
      { label: 'STR Units', get: a => a?.underwriting?.strUnits?.length },
    ]
  },
  {
    label: 'Federal',
    rows: [
      { label: 'Flood Zone', get: a => a?.parcel?.federal?.fema_flood_zone },
      { label: 'Opp. Zone', get: a => a?.parcel?.federal?.qoz },
    ]
  }
];

export default function ComparisonView({ assetIds = [], onBack }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all(assetIds.map(id => getAsset(id).catch(() => null)))
      .then(results => setAssets(results.filter(Boolean)))
      .finally(() => setLoading(false));
  }, [assetIds]);

  if (loading) {
    return (
      <div className="h-[calc(100vh-108px)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="h-[calc(100vh-108px)] flex items-center justify-center">
        <p className="text-text-tertiary">No assets to compare</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-108px)] overflow-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-border px-5 py-3 flex items-center gap-3 z-10">
        <button onClick={onBack} className="text-xs text-violet-600 hover:underline flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Targets
        </button>
        <h2 className="text-sm font-semibold text-text-primary">Deal Comparison</h2>
        <span className="text-[10px] text-text-tertiary">{assets.length} deals</span>
      </div>

      {/* Comparison table */}
      <div className="p-5">
        <table className="w-full">
          {/* Asset headers */}
          <thead>
            <tr>
              <th className="w-[160px]"></th>
              {assets.map(a => (
                <th key={a.id} className="px-4 py-3 text-left">
                  <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-xl p-3 border border-violet-100">
                    <p className="text-sm font-semibold text-violet-700 truncate">{a.label || 'Untitled'}</p>
                    <p className="text-[10px] text-text-tertiary truncate mt-0.5">{a.address}</p>
                    {a.stage && (
                      <span className="inline-block mt-1.5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full bg-white/80 text-violet-600 border border-violet-200">
                        {a.stage}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {SECTIONS.map(section => (
              <React.Fragment key={section.label}>
                {/* Section header */}
                <tr>
                  <td colSpan={assets.length + 1} className="pt-4 pb-1 px-2">
                    <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{section.label}</span>
                  </td>
                </tr>
                {/* Rows */}
                {section.rows.map(row => {
                  const values = assets.map(a => {
                    const raw = row.get(a);
                    if (raw == null || raw === '') return null;
                    return row.fmt ? row.fmt(raw) : String(raw);
                  });
                  // Skip row if all values are null
                  if (values.every(v => v === null)) return null;

                  // Highlight best value for numeric comparisons
                  return (
                    <tr key={row.label} className="border-b border-border/30">
                      <td className="px-2 py-1.5 text-[11px] text-text-tertiary font-medium">{row.label}</td>
                      {values.map((v, i) => (
                        <td key={i} className="px-4 py-1.5 text-xs font-mono text-text-primary">
                          {v || <span className="text-text-tertiary">—</span>}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
