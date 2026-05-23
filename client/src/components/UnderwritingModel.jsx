import React, { useMemo } from 'react';
import { formatCurrency, formatPercent, formatMultiple } from '../utils/formatters';

export default function UnderwritingModel({ underwriting, setUnderwriting, marketData }) {
  const u = underwriting;

  const update = (path, value) => {
    setUnderwriting(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const updateSlip = (idx, field, value) => {
    setUnderwriting(prev => {
      const next = { ...prev, slipCategories: [...prev.slipCategories] };
      next.slipCategories[idx] = { ...next.slipCategories[idx], [field]: value };
      return next;
    });
  };

  const addSlip = () => {
    setUnderwriting(prev => ({
      ...prev,
      slipCategories: [...prev.slipCategories, {
        label: '', size: 0, count: 0, monthlyRate: 0, occupancy: 85, seasonal: false, activeMonths: 7
      }]
    }));
  };

  const removeSlip = (idx) => {
    setUnderwriting(prev => ({
      ...prev,
      slipCategories: prev.slipCategories.filter((_, i) => i !== idx)
    }));
  };

  const updateSTR = (idx, field, value) => {
    setUnderwriting(prev => {
      const next = { ...prev, strUnits: [...prev.strUnits] };
      next.strUnits[idx] = { ...next.strUnits[idx], [field]: value };
      return next;
    });
  };

  const addSTR = () => {
    setUnderwriting(prev => ({
      ...prev,
      strUnits: [...prev.strUnits, {
        label: '',
        count: 0,
        adr: marketData?.avg_daily_rate || 0,
        occupancy: marketData?.avg_occupancy || 65,
        availableNights: 365
      }]
    }));
  };

  const removeSTR = (idx) => {
    setUnderwriting(prev => ({
      ...prev,
      strUnits: prev.strUnits.filter((_, i) => i !== idx)
    }));
  };

  const updateOtherRev = (idx, field, value) => {
    setUnderwriting(prev => {
      const next = { ...prev, otherRevenue: [...prev.otherRevenue] };
      next.otherRevenue[idx] = { ...next.otherRevenue[idx], [field]: value };
      return next;
    });
  };

  const addOtherRev = () => {
    setUnderwriting(prev => ({
      ...prev,
      otherRevenue: [...prev.otherRevenue, { label: '', amount: 0 }]
    }));
  };

  const removeOtherRev = (idx) => {
    setUnderwriting(prev => ({
      ...prev,
      otherRevenue: prev.otherRevenue.filter((_, i) => i !== idx)
    }));
  };

  // Calculations
  const calc = useMemo(() => {
    // Marina slip revenue
    const slipRevenue = u.slipCategories.reduce((sum, s) => {
      const months = s.seasonal ? (s.activeMonths || 7) : 12;
      return sum + (s.count * s.monthlyRate * (s.occupancy / 100) * months);
    }, 0);

    // STR revenue
    const strRevenue = u.strUnits.reduce((sum, s) => {
      return sum + (s.count * s.adr * (s.occupancy / 100) * s.availableNights);
    }, 0);

    // Blended ADR and occupancy
    const totalSTRUnits = u.strUnits.reduce((s, unit) => s + unit.count, 0);
    const blendedADR = totalSTRUnits > 0
      ? u.strUnits.reduce((s, unit) => s + unit.adr * unit.count, 0) / totalSTRUnits
      : 0;
    const blendedOcc = totalSTRUnits > 0
      ? u.strUnits.reduce((s, unit) => s + unit.occupancy * unit.count, 0) / totalSTRUnits
      : 0;

    // Other revenue
    const otherRev = u.otherRevenue.reduce((sum, r) => sum + Number(r.amount || 0), 0);

    const totalEGR = slipRevenue + strRevenue + otherRev;

    // Expenses
    const exp = u.expenses;
    const mgmtFee = exp.mgmtFeeEnabled ? totalEGR * (exp.mgmtFeePct / 100) : 0;
    const maintenance = exp.maintenanceMode === 'percent'
      ? totalEGR * (exp.maintenancePct / 100)
      : Number(exp.maintenanceFlat);

    const totalOpex = mgmtFee + Number(exp.propertyTaxes) + Number(exp.insurance) +
      Number(exp.utilities) + maintenance + Number(exp.payroll) +
      Number(exp.marketing) + Number(exp.otherOpex);

    const expenseRatio = totalEGR > 0 ? (totalOpex / totalEGR) * 100 : 0;
    const noi = totalEGR - totalOpex;

    // Valuation
    const purchasePrice = Number(u.purchasePrice) || 0;
    const capRate = purchasePrice > 0 ? (noi / purchasePrice) * 100 : 0;
    const grm = totalEGR > 0 ? purchasePrice / totalEGR : 0;
    const totalSlips = u.slipCategories.reduce((s, c) => s + Number(c.count), 0);
    const pricePerSlip = totalSlips > 0 ? purchasePrice / totalSlips : 0;
    const pricePerSTR = totalSTRUnits > 0 ? purchasePrice / totalSTRUnits : 0;
    const targetCapRate = Number(u.targetCapRate) || 7;
    const impliedValue = targetCapRate > 0 ? noi / (targetCapRate / 100) : 0;
    const variance = impliedValue - purchasePrice;

    return {
      slipRevenue, strRevenue, otherRev, totalEGR,
      mgmtFee, maintenance, totalOpex, expenseRatio, noi,
      capRate, grm, pricePerSlip, pricePerSTR,
      impliedValue, variance, blendedADR, blendedOcc,
      purchasePrice, targetCapRate
    };
  }, [u]);

  const copySummary = () => {
    const e = u.expenses;
    const text = `
RDM ASSETS — UNDERWRITING SUMMARY
═══════════════════════════════════

EFFECTIVE GROSS REVENUE (EGR)
  Marina Slip Revenue:     ${formatCurrency(calc.slipRevenue)}
  STR / Lodging Revenue:   ${formatCurrency(calc.strRevenue)}
  Other Revenue:           ${formatCurrency(calc.otherRev)}
  ─────────────────────────
  Total EGR:               ${formatCurrency(calc.totalEGR)}

OPERATING EXPENSES
  Management Fee (${e.mgmtFeePct}%):   (${formatCurrency(calc.mgmtFee)})
  Property Taxes:          (${formatCurrency(e.propertyTaxes)})
  Insurance:               (${formatCurrency(e.insurance)})
  Utilities:               (${formatCurrency(e.utilities)})
  Maintenance:             (${formatCurrency(calc.maintenance)})
  Payroll:                 (${formatCurrency(e.payroll)})
  Marketing:               (${formatCurrency(e.marketing)})
  Other:                   (${formatCurrency(e.otherOpex)})
  ─────────────────────────
  Total OpEx:              (${formatCurrency(calc.totalOpex)})
  Expense Ratio:           ${formatPercent(calc.expenseRatio)}

NET OPERATING INCOME (NOI): ${formatCurrency(calc.noi)}

VALUATION ANALYSIS
  Purchase Price:          ${formatCurrency(calc.purchasePrice)}
  Cap Rate (at price):     ${formatPercent(calc.capRate)}
  GRM:                     ${formatMultiple(calc.grm)}
  Price per Slip:          ${formatCurrency(calc.pricePerSlip)}
  Price per STR Unit:      ${formatCurrency(calc.pricePerSTR)}
  Target Cap Rate:         ${formatPercent(calc.targetCapRate)}
  Implied Value:           ${formatCurrency(calc.impliedValue)}
  Variance to Ask:         ${calc.variance >= 0 ? '+' : ''}${formatCurrency(calc.variance)}
`.trim();
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="h-full overflow-y-auto bg-canvas">
      <div className="max-w-5xl mx-auto p-6 space-y-8">

        {/* Section A: Marina Slip Revenue */}
        <Section title="Marina Slip Revenue">
          {u.slipCategories.map((slip, i) => (
            <div key={i} className="bg-surface shadow-card border border-hairline rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-ink-3">Slip Category {i + 1}</span>
                <button onClick={() => removeSlip(i)} className="text-red-600 hover:text-red-500 text-sm">×</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <Input label="Slip Type" value={slip.label} onChange={v => updateSlip(i, 'label', v)} placeholder="e.g. Wet Slip 30ft" />
                <NumInput label="Size (ft)" value={slip.size} onChange={v => updateSlip(i, 'size', Number(v))} />
                <NumInput label="Count" value={slip.count} onChange={v => updateSlip(i, 'count', Number(v))} />
                <CurrencyInput label="Monthly Rate" value={slip.monthlyRate} onChange={v => updateSlip(i, 'monthlyRate', Number(v))} />
                <SliderInput label={`Occupancy ${slip.occupancy}%`} value={slip.occupancy} onChange={v => updateSlip(i, 'occupancy', Number(v))} />
                <div>
                  <label className="text-[10px] text-ink-3 uppercase tracking-wider block mb-1">Seasonal</label>
                  <div className="flex items-center gap-2">
                    <Toggle value={slip.seasonal} onChange={v => updateSlip(i, 'seasonal', v)} />
                    {slip.seasonal && (
                      <NumInput label="" value={slip.activeMonths} onChange={v => updateSlip(i, 'activeMonths', Number(v))} placeholder="Months" small />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <button onClick={addSlip} className="text-sm text-accent hover:text-accent-hover">+ Add Slip Category</button>
          <SummaryCard label="Total Annual Slip Revenue" value={formatCurrency(calc.slipRevenue)} />
        </Section>

        {/* Section B: STR Revenue */}
        <Section title="Short-Term Rental / Lodging Revenue">
          {u.strUnits.map((unit, i) => (
            <div key={i} className="bg-surface shadow-card border border-hairline rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-ink-3">Unit Type {i + 1}</span>
                <button onClick={() => removeSTR(i)} className="text-red-600 hover:text-red-500 text-sm">×</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <Input label="Unit Type" value={unit.label} onChange={v => updateSTR(i, 'label', v)} placeholder="e.g. Lakefront Cabin" />
                <NumInput label="Count" value={unit.count} onChange={v => updateSTR(i, 'count', Number(v))} />
                <CurrencyInput label="ADR ($/night)" value={unit.adr} onChange={v => updateSTR(i, 'adr', Number(v))} />
                <SliderInput label={`Occupancy ${unit.occupancy}%`} value={unit.occupancy} onChange={v => updateSTR(i, 'occupancy', Number(v))} />
                <NumInput label="Avail. Nights/yr" value={unit.availableNights} onChange={v => updateSTR(i, 'availableNights', Number(v))} />
              </div>
            </div>
          ))}
          <button onClick={addSTR} className="text-sm text-accent hover:text-accent-hover">+ Add Unit Type</button>
          <div className="flex gap-4">
            <SummaryCard label="Total Annual STR Revenue" value={formatCurrency(calc.strRevenue)} />
            <MiniCard label="Blended ADR" value={`$${calc.blendedADR.toFixed(0)}/night`} />
            <MiniCard label="Blended Occupancy" value={formatPercent(calc.blendedOcc)} />
          </div>
        </Section>

        {/* Section C: Other Revenue */}
        <Section title="Other Revenue">
          {u.otherRevenue.map((rev, i) => (
            <div key={i} className="flex items-end gap-3">
              <Input label="Revenue Item" value={rev.label} onChange={v => updateOtherRev(i, 'label', v)} placeholder="e.g. Fuel dock" />
              <CurrencyInput label="Annual Amount" value={rev.amount} onChange={v => updateOtherRev(i, 'amount', Number(v))} />
              <button onClick={() => removeOtherRev(i)} className="text-red-600 hover:text-red-500 text-sm pb-2">×</button>
            </div>
          ))}
          <button onClick={addOtherRev} className="text-sm text-accent hover:text-accent-hover">+ Add Revenue Line</button>
        </Section>

        {/* Section D: Operating Expenses */}
        <Section title="Operating Expenses">
          <div className="bg-surface shadow-card border border-hairline rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Toggle value={u.expenses.mgmtFeeEnabled} onChange={v => update('expenses.mgmtFeeEnabled', v)} />
                <span className="text-sm text-ink-1">Include RDM Management Co. Fee</span>
              </div>
              {u.expenses.mgmtFeeEnabled && (
                <div className="flex items-center gap-2">
                  <NumInput label="" value={u.expenses.mgmtFeePct} onChange={v => update('expenses.mgmtFeePct', Number(v))} small />
                  <span className="text-sm text-ink-3">% of EGR</span>
                  <span className="text-sm font-mono text-accent ml-2">{formatCurrency(calc.mgmtFee)}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <CurrencyInput label="Property Taxes (annual)" value={u.expenses.propertyTaxes} onChange={v => update('expenses.propertyTaxes', Number(v))} />
              <CurrencyInput label="Insurance (annual)" value={u.expenses.insurance} onChange={v => update('expenses.insurance', Number(v))} />
              <CurrencyInput label="Utilities (annual)" value={u.expenses.utilities} onChange={v => update('expenses.utilities', Number(v))} />
              <div>
                <label className="text-[10px] text-ink-3 uppercase tracking-wider block mb-1">Maintenance & Repairs</label>
                <div className="flex items-center gap-2">
                  <select
                    value={u.expenses.maintenanceMode}
                    onChange={e => update('expenses.maintenanceMode', e.target.value)}
                    className="bg-canvas border border-hairline rounded px-2 py-1.5 text-sm text-ink-1"
                  >
                    <option value="percent">% of Revenue</option>
                    <option value="flat">Flat $</option>
                  </select>
                  {u.expenses.maintenanceMode === 'percent' ? (
                    <NumInput label="" value={u.expenses.maintenancePct} onChange={v => update('expenses.maintenancePct', Number(v))} small />
                  ) : (
                    <CurrencyInput label="" value={u.expenses.maintenanceFlat} onChange={v => update('expenses.maintenanceFlat', Number(v))} />
                  )}
                </div>
              </div>
              <CurrencyInput label="Payroll" value={u.expenses.payroll} onChange={v => update('expenses.payroll', Number(v))} />
              <CurrencyInput label="Marketing" value={u.expenses.marketing} onChange={v => update('expenses.marketing', Number(v))} />
              <CurrencyInput label="Other OpEx" value={u.expenses.otherOpex} onChange={v => update('expenses.otherOpex', Number(v))} />
            </div>
          </div>
        </Section>

        {/* Section E: Summary */}
        <div className="bg-surface shadow-card border-2 border-accent/30 rounded-xl p-6 space-y-5">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-accent">Underwriting Summary</h2>
            <button onClick={copySummary} className="px-4 py-1.5 bg-accent-subtle border border-accent/40 text-accent rounded text-xs hover:bg-accent/20 transition-colors">
              Copy Summary
            </button>
          </div>

          {/* EGR */}
          <div>
            <h3 className="text-xs text-ink-3 uppercase tracking-wider mb-3">Effective Gross Revenue (EGR)</h3>
            <div className="space-y-1">
              <SummaryLine label="Marina Slip Revenue" value={formatCurrency(calc.slipRevenue)} />
              <SummaryLine label="STR / Lodging Revenue" value={formatCurrency(calc.strRevenue)} />
              <SummaryLine label="Other Revenue" value={formatCurrency(calc.otherRev)} />
              <div className="border-t border-hairline my-2" />
              <SummaryLine label="Total EGR" value={formatCurrency(calc.totalEGR)} bold />
            </div>
          </div>

          {/* OpEx */}
          <div>
            <h3 className="text-xs text-ink-3 uppercase tracking-wider mb-3">Operating Expenses</h3>
            <div className="space-y-1">
              {u.expenses.mgmtFeeEnabled && (
                <SummaryLine label={`RDM Management Fee (${u.expenses.mgmtFeePct}%)`} value={`(${formatCurrency(calc.mgmtFee)})`} negative />
              )}
              <SummaryLine label="Property Taxes" value={`(${formatCurrency(u.expenses.propertyTaxes)})`} negative />
              <SummaryLine label="Insurance" value={`(${formatCurrency(u.expenses.insurance)})`} negative />
              <SummaryLine label="Utilities" value={`(${formatCurrency(u.expenses.utilities)})`} negative />
              <SummaryLine label="Maintenance" value={`(${formatCurrency(calc.maintenance)})`} negative />
              <SummaryLine label="Payroll" value={`(${formatCurrency(u.expenses.payroll)})`} negative />
              <SummaryLine label="Marketing" value={`(${formatCurrency(u.expenses.marketing)})`} negative />
              <SummaryLine label="Other" value={`(${formatCurrency(u.expenses.otherOpex)})`} negative />
              <div className="border-t border-hairline my-2" />
              <SummaryLine label="Total OpEx" value={`(${formatCurrency(calc.totalOpex)})`} bold negative />
              <SummaryLine label="Expense Ratio" value={formatPercent(calc.expenseRatio)} dim />
            </div>
          </div>

          {/* NOI */}
          <div className="bg-canvas rounded-lg p-4 text-center">
            <p className="text-xs text-ink-3 uppercase tracking-wider mb-1">Net Operating Income (NOI)</p>
            <p className={`text-3xl font-mono font-bold ${calc.noi >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(calc.noi)}
            </p>
          </div>

          {/* Valuation */}
          <div>
            <h3 className="text-xs text-ink-3 uppercase tracking-wider mb-3">Valuation Analysis</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <CurrencyInput label="Purchase Price" value={u.purchasePrice} onChange={v => update('purchasePrice', Number(v))} />
              <NumInput label="Target Cap Rate (%)" value={u.targetCapRate} onChange={v => update('targetCapRate', Number(v))} />
            </div>
            <div className="space-y-1">
              <SummaryLine label="Cap Rate (at purchase price)" value={formatPercent(calc.capRate)} />
              <SummaryLine label="GRM (Gross Revenue Multiple)" value={formatMultiple(calc.grm)} />
              <SummaryLine label="Price per Slip" value={formatCurrency(calc.pricePerSlip)} />
              <SummaryLine label="Price per STR Unit" value={formatCurrency(calc.pricePerSTR)} />
              <div className="border-t border-hairline my-2" />
              <SummaryLine label={`Implied Value at ${formatPercent(calc.targetCapRate)} Cap`} value={formatCurrency(calc.impliedValue)} bold />
              <SummaryLine
                label="Variance to Ask"
                value={`${calc.variance >= 0 ? '+' : ''}${formatCurrency(calc.variance)}`}
                color={calc.variance >= 0 ? 'text-emerald-600' : 'text-red-600'}
                bold
              />
            </div>
          </div>
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}

// Sub-components
function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-accent uppercase tracking-wider">{title}</h2>
      {children}
    </div>
  );
}

function Input({ label, value, onChange, placeholder }) {
  return (
    <div>
      {label && <label className="text-[10px] text-ink-3 uppercase tracking-wider block mb-1">{label}</label>}
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-canvas border border-hairline rounded px-3 py-1.5 text-sm text-ink-1 focus:outline-none focus:border-accent"
      />
    </div>
  );
}

function NumInput({ label, value, onChange, placeholder, small }) {
  return (
    <div className={small ? 'w-16' : ''}>
      {label && <label className="text-[10px] text-ink-3 uppercase tracking-wider block mb-1">{label}</label>}
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`bg-canvas border border-hairline rounded px-3 py-1.5 text-sm font-mono text-ink-1 focus:outline-none focus:border-accent ${small ? 'w-16' : 'w-full'}`}
      />
    </div>
  );
}

function CurrencyInput({ label, value, onChange }) {
  return (
    <div>
      {label && <label className="text-[10px] text-ink-3 uppercase tracking-wider block mb-1">{label}</label>}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-3">$</span>
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-canvas border border-hairline rounded pl-7 pr-3 py-1.5 text-sm font-mono text-ink-1 text-right focus:outline-none focus:border-accent"
        />
      </div>
    </div>
  );
}

function SliderInput({ label, value, onChange }) {
  return (
    <div>
      <label className="text-[10px] text-ink-3 uppercase tracking-wider block mb-1">{label}</label>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full"
      />
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-10 h-5 rounded-full transition-colors ${value ? 'bg-accent' : 'bg-muted'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${value ? 'left-5' : 'left-0.5'}`} />
    </button>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="bg-surface shadow-card border border-accent/30 rounded-lg p-4 flex-1">
      <p className="text-[10px] text-ink-3 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xl font-mono font-bold text-accent">{value}</p>
    </div>
  );
}

function MiniCard({ label, value }) {
  return (
    <div className="bg-surface shadow-card border border-hairline rounded-lg p-3">
      <p className="text-[10px] text-ink-3 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-mono text-ink-1">{value}</p>
    </div>
  );
}

function SummaryLine({ label, value, bold, negative, dim, color }) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-sm ${dim ? 'text-ink-3' : 'text-ink-1'} ${bold ? 'font-semibold' : ''}`}>{label}</span>
      <span className={`text-sm font-mono ${color || (negative ? 'text-red-500' : bold ? 'text-accent font-semibold' : 'text-ink-1')}`}>
        {value}
      </span>
    </div>
  );
}
