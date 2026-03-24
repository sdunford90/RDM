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
      backgroundColor: 'rgba(201, 168, 76, 0.6)',
      borderColor: '#C9A84C',
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
        color: '#8A9BBE',
        font: { size: 11, family: 'Inter' }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: { color: '#8A9BBE', font: { size: 10 } },
        grid: { color: '#2A3550' }
      },
      x: {
        ticks: { color: '#8A9BBE', font: { size: 10 } },
        grid: { display: false }
      }
    }
  };

  return (
    <div className="bg-navy-800 border border-navy-700 rounded-lg p-4 h-48">
      <Bar data={chartData} options={options} />
    </div>
  );
}
