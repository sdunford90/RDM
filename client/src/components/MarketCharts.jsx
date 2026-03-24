import React from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { ticks: { color: '#8A9BBE', font: { size: 10 } }, grid: { color: '#2A3550' } },
    x: { ticks: { color: '#8A9BBE', font: { size: 10 } }, grid: { display: false } }
  }
};

export default function MarketCharts({ metrics, estimate }) {
  if (!metrics && !estimate) return null;

  const hasOcc = metrics?.occupancy?.monthly && Array.isArray(metrics.occupancy.monthly);
  const hasADR = metrics?.adr?.monthly && Array.isArray(metrics.adr.monthly);
  const hasEstimate = estimate?.monthly_revenue_breakdown && Array.isArray(estimate.monthly_revenue_breakdown);

  if (!hasOcc && !hasADR && !hasEstimate) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gold uppercase tracking-wider">Market Trends</h3>

      {hasOcc && (
        <div className="bg-navy-800 border border-navy-700 rounded-lg p-4 h-48">
          <Bar
            data={{
              labels: MONTHS.slice(0, metrics.occupancy.monthly.length),
              datasets: [{
                label: 'Occupancy %',
                data: metrics.occupancy.monthly.map(d => d.value || d.occupancy || d),
                backgroundColor: 'rgba(201, 168, 76, 0.6)',
                borderColor: '#C9A84C',
                borderWidth: 1,
                borderRadius: 4
              }]
            }}
            options={{
              ...chartDefaults,
              plugins: { ...chartDefaults.plugins, title: { display: true, text: 'Monthly Occupancy %', color: '#8A9BBE', font: { size: 11 } } },
              scales: { ...chartDefaults.scales, y: { ...chartDefaults.scales.y, min: 0, max: 100 } }
            }}
          />
        </div>
      )}

      {hasADR && (
        <div className="bg-navy-800 border border-navy-700 rounded-lg p-4 h-48">
          <Line
            data={{
              labels: MONTHS.slice(0, metrics.adr.monthly.length),
              datasets: [{
                label: 'ADR ($)',
                data: metrics.adr.monthly.map(d => d.value || d.adr || d),
                borderColor: '#C9A84C',
                backgroundColor: 'rgba(201, 168, 76, 0.1)',
                fill: true,
                tension: 0.3,
                pointRadius: 3,
                pointBackgroundColor: '#C9A84C'
              }]
            }}
            options={{
              ...chartDefaults,
              plugins: { ...chartDefaults.plugins, title: { display: true, text: 'Monthly ADR ($)', color: '#8A9BBE', font: { size: 11 } } }
            }}
          />
        </div>
      )}

      {hasEstimate && (
        <div className="bg-navy-800 border border-navy-700 rounded-lg p-4 h-48">
          <Bar
            data={{
              labels: MONTHS.slice(0, estimate.monthly_revenue_breakdown.length),
              datasets: [{
                label: 'Est. Revenue ($)',
                data: estimate.monthly_revenue_breakdown.map(d => d.revenue || d.value || d),
                backgroundColor: 'rgba(61, 170, 110, 0.6)',
                borderColor: '#3DAA6E',
                borderWidth: 1,
                borderRadius: 4
              }]
            }}
            options={{
              ...chartDefaults,
              plugins: { ...chartDefaults.plugins, title: { display: true, text: 'Projected Monthly Revenue ($)', color: '#8A9BBE', font: { size: 11 } } }
            }}
          />
        </div>
      )}
    </div>
  );
}
