'use client';

import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import ChartDataLabels, { type Context } from 'chartjs-plugin-datalabels';
import { Scatter } from 'react-chartjs-2';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend, ChartDataLabels);

interface Props {
  zValues: number[];
  dhValues: number[];
  ltdsGeostrip: number[];
  ltdsGeogrid: number[];
  ltdsSg: number[];
  ltdsSs: number[];
}

type Point = { x: number; y: number; dh: number };

export default function InternalStabilityChart({
  zValues, dhValues, ltdsGeostrip, ltdsGeogrid, ltdsSg, ltdsSs,
}: Props) {
  // Convert lb/ft → kip/ft
  const make = (ltds: number[]): Point[] =>
    ltds.map((v, i) => ({ x: v / 1000, y: zValues[i], dh: dhValues[i] }));

  const fmt = (p: Point) => `DH=${p.dh}', ${p.x.toFixed(2)}`;

  const maxZ = Math.max(...zValues);

  // Stagger label positions per dataset so they don't overlap:
  //   Geostrip  → left,  every 5th point starting at index 0
  //   Geogrid   → right, every 5th point starting at index 1
  //   Met. Grid → right, every 5th point starting at index 2
  //   Met. Strip→ right, every 5th point starting at index 3
  const datasets = [
    {
      label: 'Geostrip',
      data: make(ltdsGeostrip),
      borderColor: 'rgba(75,192,192,1)',
      backgroundColor: 'rgba(75,192,192,1)',
      borderWidth: 2, pointRadius: 4, showLine: true,
      datalabels: { display: (ctx: Context) => ctx.dataIndex % 5 === 0, align: 'left' as const },
    },
    {
      label: 'Geogrid',
      data: make(ltdsGeogrid),
      borderColor: 'rgba(255,99,132,1)',
      backgroundColor: 'rgba(255,99,132,1)',
      borderWidth: 2, pointRadius: 4, showLine: true,
      datalabels: { display: (ctx: Context) => ctx.dataIndex % 5 === 1, align: 'right' as const },
    },
    {
      label: 'Metallic Grid',
      data: make(ltdsSg),
      borderColor: 'rgba(54,162,235,1)',
      backgroundColor: 'rgba(54,162,235,1)',
      borderWidth: 2, pointRadius: 4, showLine: true,
      datalabels: { display: (ctx: Context) => ctx.dataIndex % 5 === 2, align: 'right' as const },
    },
    {
      label: 'Metallic Strip',
      data: make(ltdsSs),
      borderColor: 'rgba(153,102,255,1)',
      backgroundColor: 'rgba(153,102,255,1)',
      borderWidth: 2, pointRadius: 4, showLine: true,
      datalabels: { display: (ctx: Context) => ctx.dataIndex % 5 === 3, align: 'right' as const },
    },
  ];

  const options: ChartOptions<'scatter'> = {
    responsive: true,
    parsing: false,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'linear',
        position: 'bottom',
        title: { display: true, text: 'Required Factored Long Term Design Strength, LTDS (kip/ft)' },
        beginAtZero: true,
        grid: { display: true, color: 'rgba(0,0,0,0.07)' },
        ticks: {
          stepSize: 0.5,
          callback: (v) => Number(v).toFixed(1),
        },
      },
      y: {
        type: 'linear',
        title: { display: true, text: 'Depth Below Finished Grade, z (ft)' },
        beginAtZero: true,
        max: Math.ceil(maxZ + 1),
        reverse: true,
        grid: { display: true, color: 'rgba(0,0,0,0.07)' },
        ticks: {
          stepSize: 1,
          callback: (v) => Number(v) % 5 === 0 ? String(v) : '',
        },
      },
    },
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const d = ctx.raw as Point;
            return `DH=${d.dh}ft  z=${d.y.toFixed(2)}ft  LTDS=${d.x.toFixed(3)} kip/ft`;
          },
        },
      },
      datalabels: {
        anchor: 'center',
        offset: 6,
        formatter: fmt,
        font: { size: 9 },
        color: '#1f2937',
        padding: { top: 2, bottom: 2, left: 4, right: 4 },
        clip: false,
        backgroundColor: 'white',
        borderColor: '#9ca3af',
        borderWidth: 1,
        borderRadius: 2,
      },
    },
  };

  return (
    <div style={{ height: '700px' }}>
      <Scatter data={{ datasets }} options={options} />
    </div>
  );
}
