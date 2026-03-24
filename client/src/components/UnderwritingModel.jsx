import React, { useMemo } from 'react';
import { formatCurrency, formatPercent, formatMultiple, formatNumber } from '../utils/formatters';

export default function UnderwritingModel({ underwriting, setUnderwriting, marketData, parcelData }) {
  const u = underwriting;

  const update = (path, value) => {
    setUnderwriting(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.'); let obj = next;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value; return next;
    });
  };

  const updateSlip = (idx, field, value) => setUnderwriting(prev => { const next = { ...prev, slipCategories: [...prev.slipCategories] }; next.slipCategories[idx] = { ...next.slipCategories[idx], [field]: value }; return next; });
  const addSlip = () => setUnderwriting(prev => ({ ...prev, slipCategories: [...prev.slipCategories, { label: '', size: 0, count: 0, monthlyRate: 0, occupancy: 85, seasonal: false, activeMonths: 7 }] }));
  const removeSlip = (idx) => setUnderwriting(prev => ({ ...prev, slipCategories: prev.slipCategories.filter((_, i) => i !== idx) }));

  const updateSTR = (idx, field, value) => setUnderwriting(prev => { const next = { ...prev, strUnits: [...prev.strUnits] }; next.strUnits[idx] = { ...next.strUnits[idx], [field]: value }; return next; });
  const addSTR = () => {
    const estADR = marketData?.estimate?.projected_adr || marketData?.summary?.avg_daily_rate || marketData?.avg_daily_rate || 0;
    const estOcc = marketData?.estimate?.projected_occupancy || marketData?.summary?.avg_occupancy || marketData?.avg_occupancy || 65;
    setUnderwriting(prev => ({ ...prev, strUnits: [...prev.strUnits, { label: '', count: 0, adr: estADR, occupancy: estOcc, availableNights: 365 }] }));
  };
  const removeSTR = (idx) => setUnderwriting(prev => ({ ...prev, strUnits: prev.strUnits.filter((_, i) => i !== idx) }));

  const updateOtherRev = (idx, field, value) => setUnderwriting(prev => { const next = { ...prev, otherRevenue: [...prev.otherRevenue] }; next.otherRevenue[idx] = { ...next.otherRevenue[idx], [field]: value }; return next; });
  const addOtherRev = () => setUnderwriting(prev => ({ ...prev, otherRevenue: [...prev.otherRevenue, { label: '', amount: 0 }] }));
  const removeOtherRev = (idx) => setUnderwriting(prev => ({ ...prev, otherRevenue: prev.otherRevenue.filter((_, i) => i !== idx) }));

  const calc = useMemo(() => {
    const slipRevenue = u.slipCategories.reduce((sum, s) => sum + (s.count * s.monthlyRate * (s.occupancy / 100) * (s.seasonal ? (s.activeMonths || 7) : 12)), 0);
    const strRevenue = u.strUnits.reduce((sum, s) => sum + (s.count * s.adr * (s.occupancy / 100) * s.availableNights), 0);
    const totalSTRUnits = u.strUnits.reduce((s, unit) => s + unit.count, 0);
    const blendedADR = totalSTRUnits > 0 ? u.strUnits.reduce((s, unit) => s + unit.adr * unit.count, 0) / totalSTRUnits : 0;
    const blendedOcc = totalSTRUnits > 0 ? u.strUnits.reduce((s, unit) => s + unit.occupancy * unit.count, 0) / totalSTRUnits : 0;
    const otherRev = u.otherRevenue.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const totalEGR = slipRevenue + strRevenue + otherRev;
    const exp = u.expenses;
    const mgmtFee = exp.mgmtFeeEnabled ? totalEGR * (exp.mgmtFeePct / 100) : 0;
    const maintenance = exp.maintenanceMode === 'percent' ? totalEGR * (exp.maintenancePct / 100) : Number(exp.maintenanceFlat);
    const totalOpex = mgmtFee + Number(exp.propertyTaxes) + Number(exp.insurance) + Number(exp.utilities) + maintenance + Number(exp.payroll) + Number(exp.marketing) + Number(exp.otherOpex);
    const expenseRatio = totalEGR > 0 ? (totalOpex / totalEGR) * 100 : 0;
    const noi = totalEGR - totalOpex;
    const purchasePrice = Number(u.purchasePrice) || 0;
    const capRate = purchasePrice > 0 ? (noi / purchasePrice) * 100 : 0;
    const grm = totalEGR > 0 ? purchasePrice / totalEGR : 0;
    const totalSlips = u.slipCategories.reduce((s, c) => s + Number(c.count), 0);
    const pricePerSlip = totalSlips > 0 ? purchasePrice / totalSlips : 0;
    const pricePerSTR = totalSTRUnits > 0 ? purchasePrice / totalSTRUnits : 0;
    const targetCapRate = Number(u.targetCapRate) || 7;
    const impliedValue = targetCapRate > 0 ? noi / (targetCapRate / 100) : 0;
    const variance = impliedValue - purchasePrice;
    return { slipRevenue, strRevenue, otherRev, totalEGR, mgmtFee, maintenance, totalOpex, expenseRatio, noi, capRate, grm, pricePerSlip, pricePerSTR, impliedValue, variance, blendedADR, blendedOcc, purchasePrice, targetCapRate };
  }, [u]);

  const copySummary = () => {
    const e = u.expenses;
    navigator.clipboard.writeText(`RDM ASSETS — UNDERWRITING SUMMARY\n${'='.repeat(40)}\n\nEFFECTIVE GROSS REVENUE\n  Marina Slips:    ${formatCurrency(calc.slipRevenue)}\n  STR/Lodging:     ${formatCurrency(calc.strRevenue)}\n  Other:           ${formatCurrency(calc.otherRev)}\n  Total EGR:       ${formatCurrency(calc.totalEGR)}\n\nOPERATING EXPENSES\n  Mgmt Fee (${e.mgmtFeePct}%): (${formatCurrency(calc.mgmtFee)})\n  Taxes:           (${formatCurrency(e.propertyTaxes)})\n  Insurance:       (${formatCurrency(e.insurance)})\n  Utilities:       (${formatCurrency(e.utilities)})\n  Maintenance:     (${formatCurrency(calc.maintenance)})\n  Payroll:         (${formatCurrency(e.payroll)})\n  Marketing:       (${formatCurrency(e.marketing)})\n  Other:           (${formatCurrency(e.otherOpex)})\n  Total OpEx:      (${formatCurrency(calc.totalOpex)})\n  Expense Ratio:   ${formatPercent(calc.expenseRatio)}\n\nNOI: ${formatCurrency(calc.noi)}\n\nVALUATION\n  Purchase Price:  ${formatCurrency(calc.purchasePrice)}\n  Cap Rate:        ${formatPercent(calc.capRate)}\n  GRM:             ${formatMultiple(calc.grm)}\n  Per Slip:        ${formatCurrency(calc.pricePerSlip)}\n  Per STR Unit:    ${formatCurrency(calc.pricePerSTR)}\n  Target Cap:      ${formatPercent(calc.targetCapRate)}\n  Implied Value:   ${formatCurrency(calc.impliedValue)}\n  Variance:        ${calc.variance >= 0 ? '+' : ''}${formatCurrency(calc.variance)}`);
  };

  return (
    <div className="h-[calc(100vh-108px)] overflow-y-auto bg-surface-1">
      <div className="max-w-5xl mx-auto p-6 space-y-6">

        {/* Reference bar */}
        {(parcelData || marketData) && !parcelData?.error && (
          <div className="bg-white rounded-2xl p-5 border border-border shadow-soft">
            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-3">Reference Data</p>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-2">
              {parcelData?.physical?.numunits && <Ref label="Units" value={parcelData.physical.numunits} />}
              {parcelData?.physical?.area_building && <Ref label="Building" value={`${formatNumber(parcelData.physical.area_building)} sf`} />}
              {parcelData?.physical?.ll_gisacre && <Ref label="Acres" value={parcelData.physical.ll_gisacre} />}
              {parcelData?.tax?.taxamt && <Ref label="Tax Bill" value={formatCurrency(parcelData.tax.taxamt)} accent />}
              {(marketData?.estimate?.projected_adr || marketData?.avg_daily_rate) && <Ref label="Est ADR" value={`$${marketData.estimate?.projected_adr || marketData.summary?.avg_daily_rate || marketData.avg_daily_rate}/nt`} accent />}
              {(marketData?.estimate?.projected_occupancy || marketData?.avg_occupancy) && <Ref label="Est Occ" value={formatPercent(marketData.estimate?.projected_occupancy || marketData.summary?.avg_occupancy || marketData.avg_occupancy)} accent />}
            </div>
          </div>
        )}

        {/* Marina Slips */}
        <Section title="Marina Slip Revenue" color="violet">
          {u.slipCategories.map((slip, i) => (
            <Card key={i} onRemove={() => removeSlip(i)} label={`Slip Category ${i+1}`}>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <Inp label="Type" value={slip.label} onChange={v => updateSlip(i,'label',v)} ph="Wet Slip 30ft" />
                <Num label="Size (ft)" value={slip.size} onChange={v => updateSlip(i,'size',Number(v))} />
                <Num label="Count" value={slip.count} onChange={v => updateSlip(i,'count',Number(v))} />
                <Cur label="Monthly Rate" value={slip.monthlyRate} onChange={v => updateSlip(i,'monthlyRate',Number(v))} />
                <Slider label={`Occ ${slip.occupancy}%`} value={slip.occupancy} onChange={v => updateSlip(i,'occupancy',Number(v))} />
                <div>
                  <label className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider block mb-1.5">Seasonal</label>
                  <div className="flex items-center gap-2">
                    <Toggle value={slip.seasonal} onChange={v => updateSlip(i,'seasonal',v)} />
                    {slip.seasonal && <Num label="" value={slip.activeMonths} onChange={v => updateSlip(i,'activeMonths',Number(v))} ph="Mo" small />}
                  </div>
                </div>
              </div>
            </Card>
          ))}
          <AddBtn onClick={addSlip}>Add Slip Category</AddBtn>
          <KPI label="Total Slip Revenue" value={formatCurrency(calc.slipRevenue)} color="violet" />
        </Section>

        {/* STR */}
        <Section title="Short-Term Rental / Lodging" color="pink">
          {u.strUnits.map((unit, i) => (
            <Card key={i} onRemove={() => removeSTR(i)} label={`Unit Type ${i+1}`}>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <Inp label="Type" value={unit.label} onChange={v => updateSTR(i,'label',v)} ph="Lakefront Cabin" />
                <Num label="Count" value={unit.count} onChange={v => updateSTR(i,'count',Number(v))} />
                <Cur label="ADR ($/night)" value={unit.adr} onChange={v => updateSTR(i,'adr',Number(v))} />
                <Slider label={`Occ ${unit.occupancy}%`} value={unit.occupancy} onChange={v => updateSTR(i,'occupancy',Number(v))} />
                <Num label="Nights/yr" value={unit.availableNights} onChange={v => updateSTR(i,'availableNights',Number(v))} />
              </div>
            </Card>
          ))}
          <AddBtn onClick={addSTR}>Add Unit Type</AddBtn>
          <div className="flex gap-3">
            <KPI label="Total STR Revenue" value={formatCurrency(calc.strRevenue)} color="pink" />
            <Mini label="Blended ADR" value={`$${calc.blendedADR.toFixed(0)}/nt`} />
            <Mini label="Blended Occ" value={formatPercent(calc.blendedOcc)} />
          </div>
        </Section>

        {/* Other Revenue */}
        <Section title="Other Revenue" color="teal">
          {u.otherRevenue.map((rev, i) => (
            <div key={i} className="flex items-end gap-3">
              <Inp label="Item" value={rev.label} onChange={v => updateOtherRev(i,'label',v)} ph="Fuel dock" />
              <Cur label="Annual" value={rev.amount} onChange={v => updateOtherRev(i,'amount',Number(v))} />
              <button onClick={() => removeOtherRev(i)} className="text-text-tertiary hover:text-negative text-sm pb-2.5 transition-colors">x</button>
            </div>
          ))}
          <AddBtn onClick={addOtherRev}>Add Revenue Line</AddBtn>
        </Section>

        {/* Expenses */}
        <Section title="Operating Expenses" color="orange">
          <div className="bg-white border border-border rounded-2xl p-5 space-y-4 shadow-soft">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Toggle value={u.expenses.mgmtFeeEnabled} onChange={v => update('expenses.mgmtFeeEnabled',v)} />
                <span className="text-sm font-medium text-text-primary">RDM Management Fee</span>
              </div>
              {u.expenses.mgmtFeeEnabled && (
                <div className="flex items-center gap-2">
                  <Num label="" value={u.expenses.mgmtFeePct} onChange={v => update('expenses.mgmtFeePct',Number(v))} small />
                  <span className="text-xs text-text-tertiary">% of EGR</span>
                  <span className="text-sm font-mono font-semibold text-accent ml-2">{formatCurrency(calc.mgmtFee)}</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Cur label="Property Taxes" value={u.expenses.propertyTaxes} onChange={v => update('expenses.propertyTaxes',Number(v))} />
              <Cur label="Insurance" value={u.expenses.insurance} onChange={v => update('expenses.insurance',Number(v))} />
              <Cur label="Utilities" value={u.expenses.utilities} onChange={v => update('expenses.utilities',Number(v))} />
              <div>
                <label className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider block mb-1.5">Maintenance</label>
                <div className="flex items-center gap-2">
                  <select value={u.expenses.maintenanceMode} onChange={e => update('expenses.maintenanceMode', e.target.value)}
                    className="bg-surface-1 border border-border rounded-xl px-2.5 py-2 text-xs text-text-secondary focus:outline-none focus:border-accent">
                    <option value="percent">%</option><option value="flat">$</option>
                  </select>
                  {u.expenses.maintenanceMode === 'percent'
                    ? <Num label="" value={u.expenses.maintenancePct} onChange={v => update('expenses.maintenancePct',Number(v))} small />
                    : <Cur label="" value={u.expenses.maintenanceFlat} onChange={v => update('expenses.maintenanceFlat',Number(v))} />}
                </div>
              </div>
              <Cur label="Payroll" value={u.expenses.payroll} onChange={v => update('expenses.payroll',Number(v))} />
              <Cur label="Marketing" value={u.expenses.marketing} onChange={v => update('expenses.marketing',Number(v))} />
              <Cur label="Other OpEx" value={u.expenses.otherOpex} onChange={v => update('expenses.otherOpex',Number(v))} />
            </div>
          </div>
        </Section>

        {/* Summary */}
        <div className="bg-white border border-violet-200 rounded-3xl p-7 space-y-5 shadow-card relative overflow-hidden">
          {/* Gradient accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-hero" />

          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold gradient-text">Underwriting Summary</h2>
            <button onClick={copySummary} className="px-4 py-1.5 bg-violet-50 border border-violet-200 text-accent rounded-xl text-xs font-semibold hover:bg-violet-100 transition-all">
              Copy Summary
            </button>
          </div>

          <div>
            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-2">Effective Gross Revenue</p>
            <Row label="Marina Slips" value={formatCurrency(calc.slipRevenue)} />
            <Row label="STR / Lodging" value={formatCurrency(calc.strRevenue)} />
            <Row label="Other" value={formatCurrency(calc.otherRev)} />
            <Hr /><Row label="Total EGR" value={formatCurrency(calc.totalEGR)} bold />
          </div>

          <div>
            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-2">Operating Expenses</p>
            {u.expenses.mgmtFeeEnabled && <Row label={`Mgmt Fee (${u.expenses.mgmtFeePct}%)`} value={`(${formatCurrency(calc.mgmtFee)})`} neg />}
            <Row label="Taxes" value={`(${formatCurrency(u.expenses.propertyTaxes)})`} neg />
            <Row label="Insurance" value={`(${formatCurrency(u.expenses.insurance)})`} neg />
            <Row label="Utilities" value={`(${formatCurrency(u.expenses.utilities)})`} neg />
            <Row label="Maintenance" value={`(${formatCurrency(calc.maintenance)})`} neg />
            <Row label="Payroll" value={`(${formatCurrency(u.expenses.payroll)})`} neg />
            <Row label="Marketing" value={`(${formatCurrency(u.expenses.marketing)})`} neg />
            <Row label="Other" value={`(${formatCurrency(u.expenses.otherOpex)})`} neg />
            <Hr /><Row label="Total OpEx" value={`(${formatCurrency(calc.totalOpex)})`} bold neg />
            <Row label="Expense Ratio" value={formatPercent(calc.expenseRatio)} dim />
          </div>

          {/* NOI hero */}
          <div className={`rounded-2xl p-6 text-center ${calc.noi >= 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Net Operating Income</p>
            <p className={`text-4xl font-mono font-extrabold tracking-tight ${calc.noi >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(calc.noi)}</p>
          </div>

          <div>
            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-3">Valuation</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Cur label="Purchase Price" value={u.purchasePrice} onChange={v => update('purchasePrice',Number(v))} />
              <Num label="Target Cap (%)" value={u.targetCapRate} onChange={v => update('targetCapRate',Number(v))} />
            </div>
            <Row label="Cap Rate" value={formatPercent(calc.capRate)} />
            <Row label="GRM" value={formatMultiple(calc.grm)} />
            <Row label="Per Slip" value={formatCurrency(calc.pricePerSlip)} />
            <Row label="Per STR Unit" value={formatCurrency(calc.pricePerSTR)} />
            <Hr />
            <Row label={`Value at ${formatPercent(calc.targetCapRate)} Cap`} value={formatCurrency(calc.impliedValue)} bold />
            <Row label="Variance to Ask" value={`${calc.variance >= 0 ? '+' : ''}${formatCurrency(calc.variance)}`} color={calc.variance >= 0 ? 'text-emerald-600' : 'text-red-500'} bold />
          </div>
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}

// Primitives
const sectionColors = { violet: 'border-l-violet-400', pink: 'border-l-pink-400', teal: 'border-l-teal-400', orange: 'border-l-orange-400', emerald: 'border-l-emerald-400' };

function Section({ title, children, color = 'violet' }) {
  return <div className={`space-y-3 pl-4 border-l-2 ${sectionColors[color] || sectionColors.violet}`}><h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider">{title}</h2>{children}</div>;
}

function Card({ children, onRemove, label }) {
  return (
    <div className="bg-white border border-border rounded-2xl p-4 space-y-3 shadow-soft">
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-semibold text-text-tertiary">{label}</span>
        <button onClick={onRemove} className="w-6 h-6 flex items-center justify-center rounded-lg text-text-tertiary hover:text-negative hover:bg-red-50 transition-all text-sm">x</button>
      </div>
      {children}
    </div>
  );
}

function Inp({ label, value, onChange, ph }) {
  return (
    <div>
      {label && <label className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider block mb-1.5">{label}</label>}
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={ph}
        className="w-full bg-surface-1 border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent focus:shadow-input-focus transition-all" />
    </div>
  );
}

function Num({ label, value, onChange, ph, small }) {
  return (
    <div className={small ? 'w-16' : ''}>
      {label && <label className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider block mb-1.5">{label}</label>}
      <input type="number" value={value} onChange={e => onChange(e.target.value)} placeholder={ph}
        className={`bg-surface-1 border border-border rounded-xl px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-accent focus:shadow-input-focus transition-all ${small ? 'w-16' : 'w-full'}`} />
    </div>
  );
}

function Cur({ label, value, onChange }) {
  return (
    <div>
      {label && <label className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider block mb-1.5">{label}</label>}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-text-tertiary">$</span>
        <input type="number" value={value} onChange={e => onChange(e.target.value)}
          className="w-full bg-surface-1 border border-border rounded-xl pl-7 pr-3 py-2 text-sm font-mono text-text-primary text-right focus:outline-none focus:border-accent focus:shadow-input-focus transition-all" />
      </div>
    </div>
  );
}

function Slider({ label, value, onChange }) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider block mb-1.5">{label}</label>
      <input type="range" min="0" max="100" value={value} onChange={e => onChange(e.target.value)} className="w-full" />
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`relative w-10 h-[22px] rounded-full transition-all shadow-inner ${value ? 'bg-gradient-brand' : 'bg-surface-3'}`}>
      <span className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-md transition-all ${value ? 'left-[22px]' : 'left-[3px]'}`} />
    </button>
  );
}

function AddBtn({ onClick, children }) {
  return <button onClick={onClick} className="text-xs font-semibold text-accent hover:text-accent-dark transition-colors">+ {children}</button>;
}

function KPI({ label, value, color = 'violet' }) {
  const bg = { violet: 'bg-violet-50 border-violet-200', pink: 'bg-pink-50 border-pink-200', teal: 'bg-teal-50 border-teal-200' };
  const text = { violet: 'text-violet-600', pink: 'text-pink-600', teal: 'text-teal-600' };
  return (
    <div className={`${bg[color]} border rounded-2xl p-4 flex-1`}>
      <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-mono font-extrabold ${text[color]}`}>{value}</p>
    </div>
  );
}

function Mini({ label, value }) {
  return (
    <div className="bg-white border border-border rounded-2xl p-3 shadow-soft">
      <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-mono font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function Ref({ label, value, accent }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-mono font-medium ${accent ? 'text-accent' : 'text-text-primary'}`}>{value}</p>
    </div>
  );
}

function Row({ label, value, bold, neg, dim, color }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className={`text-[13px] ${dim ? 'text-text-tertiary' : 'text-text-secondary'} ${bold ? 'font-semibold text-text-primary' : ''}`}>{label}</span>
      <span className={`text-[13px] font-mono ${color || (neg ? 'text-red-400' : bold ? 'text-accent font-bold' : 'text-text-primary font-medium')}`}>{value}</span>
    </div>
  );
}

function Hr() { return <div className="border-t border-border my-2" />; }
