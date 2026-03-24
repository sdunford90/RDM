import React from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler } from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const base = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: '#18181b', borderColor: '#27272a', borderWidth: 1, titleColor: '#fafafa', bodyColor: '#a1a1aa', padding: 10, cornerRadius: 8 } },
  scales: {
    y: { ticks: { color: '#71717a', font: { size: 10 } }, grid: { color: 'rgba(39,39,42,0.5)', drawBorder: false } },
    x: { ticks: { color: '#71717a', font: { size: 10 } }, grid: { display: false } }
  }
};

export default function MarketCharts({ metrics, estimate }) {
  if (!metrics && !estimate) return null;
  const hasOcc = metrics?.occupancy?.monthly && Array.isArray(metrics.occupancy.monthly);
  const hasADR = metrics?.adr?.monthly && Array.isArray(metrics.adr.monthly);
  const hasEst = estimate?.monthly_revenue_breakdown && Array.isArray(estimate.monthly_revenue_breakdown);
  if (!hasOcc && !hasADR && !hasEst) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Trends</h3>
      {hasOcc && <Chart><Bar data={{ labels: MONTHS.slice(0, metrics.occupancy.monthly.length), datasets: [{ data: metrics.occupancy.monthly.map(d => d.value||d.occupancy||d), backgroundColor: 'rgba(99,102,241,0.4)', borderColor: '#6366f1', borderWidth: 1, borderRadius: 4 }] }} options={{ ...base, plugins: { ...base.plugins, title: { display: true, text: 'Occupancy %', color: '#71717a', font: { size: 10 } } }, scales: { ...base.scales, y: { ...base.scales.y, min: 0, max: 100 } } }} /></Chart>}
      {hasADR && <Chart><Line data={{ labels: MONTHS.slice(0, metrics.adr.monthly.length), datasets: [{ data: metrics.adr.monthly.map(d => d.value||d.adr||d), borderColor: '#818cf8', backgroundColor: 'rgba(99,102,241,0.05)', fill: true, tension: 0.3, pointRadius: 3, pointBackgroundColor: '#818cf8' }] }} options={{ ...base, plugins: { ...base.plugins, title: { display: true, text: 'ADR ($)', color: '#71717a', font: { size: 10 } } } }} /></Chart>}
      {hasEst && <Chart><Bar data={{ labels: MONTHS.slice(0, estimate.monthly_revenue_breakdown.length), datasets: [{ data: estimate.monthly_revenue_breakdown.map(d => d.revenue||d.value||d), backgroundColor: 'rgba(52,211,153,0.4)', borderColor: '#34d399', borderWidth: 1, borderRadius: 4 }] }} options={{ ...base, plugins: { ...base.plugins, title: { display: true, text: 'Projected Revenue ($)', color: '#71717a', font: { size: 10 } } } }} /></Chart>}
    </div>
  );
}

function Chart({ children }) { return <div className="bg-surface-2 border border-border/50 rounded-xl p-4 h-44">{children}</div>; }
