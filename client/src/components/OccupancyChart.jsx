import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function OccupancyChart({ data }) {
  if (!data || !Array.isArray(data) || data.length === 0) return null;

  const occupancyValues = data.map(d => d.occupancy || d.avg_occupancy || 0);

  const chartData = {
    labels: MONTHS.slice(0, occupancyValues.length),
    datasets: [{
      label: 'Occupancy %',
      data: occupancyValues,
      backgroundColor: 'rgba(14, 116, 144, 0.6)',
      borderColor: '#0E7490',
      borderWidth: 1,
      borderRadius: 4
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'Monthly Occupancy Trend',
        color: '#64748B',
        font: { size: 11, family: 'Inter' }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: { color: '#64748B', font: { size: 10 } },
        grid: { color: '#E5E7EB' }
      },
      x: {
        ticks: { color: '#64748B', font: { size: 10 } },
        grid: { display: false }
      }
    }
  };

  return (
    <div className="bg-surface border border-hairline rounded-lg p-4 h-48 shadow-card">
      <Bar data={chartData} options={options} />
    </div>
  );
}
