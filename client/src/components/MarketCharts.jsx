import React from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler } from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const base = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, titleColor: '#0f172a', bodyColor: '#475569', padding: 10, cornerRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
  },
  scales: {
    y: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: '#f1f5f9', drawBorder: false } },
    x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } }
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
      <h3 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider pl-3 border-l-2 border-l-purple-400">Trends</h3>
      {hasOcc && (
        <ChartWrap>
          <Bar data={{ labels: MONTHS.slice(0, metrics.occupancy.monthly.length), datasets: [{ data: metrics.occupancy.monthly.map(d => d.value||d.occupancy||d), backgroundColor: 'rgba(124,58,237,0.2)', hoverBackgroundColor: 'rgba(124,58,237,0.4)', borderColor: '#7c3aed', borderWidth: 1.5, borderRadius: 6 }] }}
            options={{ ...base, plugins: { ...base.plugins, title: { display: true, text: 'Occupancy %', color: '#94a3b8', font: { size: 10, weight: 600 } } }, scales: { ...base.scales, y: { ...base.scales.y, min: 0, max: 100 } } }} />
        </ChartWrap>
      )}
      {hasADR && (
        <ChartWrap>
          <Line data={{ labels: MONTHS.slice(0, metrics.adr.monthly.length), datasets: [{ data: metrics.adr.monthly.map(d => d.value||d.adr||d), borderColor: '#ec4899', backgroundColor: 'rgba(236,72,153,0.05)', fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#ec4899', pointBorderColor: '#fff', pointBorderWidth: 2 }] }}
            options={{ ...base, plugins: { ...base.plugins, title: { display: true, text: 'ADR ($)', color: '#94a3b8', font: { size: 10, weight: 600 } } } }} />
        </ChartWrap>
      )}
      {hasEst && (
        <ChartWrap>
          <Bar data={{ labels: MONTHS.slice(0, estimate.monthly_revenue_breakdown.length), datasets: [{ data: estimate.monthly_revenue_breakdown.map(d => d.revenue||d.value||d), backgroundColor: 'rgba(16,185,129,0.2)', hoverBackgroundColor: 'rgba(16,185,129,0.4)', borderColor: '#10b981', borderWidth: 1.5, borderRadius: 6 }] }}
            options={{ ...base, plugins: { ...base.plugins, title: { display: true, text: 'Projected Revenue ($)', color: '#94a3b8', font: { size: 10, weight: 600 } } } }} />
        </ChartWrap>
      )}
    </div>
  );
}

function ChartWrap({ children }) { return <div className="bg-white rounded-2xl p-4 h-44 border border-border shadow-soft">{children}</div>; }
