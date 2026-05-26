'use client';

import dynamic from 'next/dynamic';

const InternalStabilityChart = dynamic(
  () => import('@/components/charts/internal-stability-chart'),
  { ssr: false, loading: () => <div style={{ height: '500px' }} /> },
);

export { InternalStabilityChart };
