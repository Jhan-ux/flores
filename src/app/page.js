'use client';

import dynamic from 'next/dynamic';

const LotusGarden = dynamic(() => import('../components/LotusGarden'), {
  ssr: false,
  loading: () => (
    <div id="loading-overlay">
      <svg
        className="lotus-spinner"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2.5c-2.8 4.2-4.5 9-4.5 13a4.5 4.5 0 0 0 9 0c0-4-1.7-8.8-4.5-13Z" />
        <path d="M6.5 7.5c-2.8 3.5-4 7.2-4 9.5a4.5 4.5 0 0 0 7.8 3.1c-1.5-2.6-2.6-6.5-3.8-12.6Z" />
        <path d="M17.5 7.5c2.8 3.5 4 7.2 4 9.5a4.5 4.5 0 0 1-7.8 3.1c1.5-2.6 2.6-6.5 3.8-12.6Z" />
        <path d="M12 16.5v5.5" />
      </svg>
    </div>
  )
});

export default function Home() {
  return (
    <main style={{ width: '100%', height: '100dvh', overflow: 'hidden', position: 'relative' }}>
      <LotusGarden />
    </main>
  );
}
