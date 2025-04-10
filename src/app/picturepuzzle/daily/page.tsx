// src/app/picturepuzzle/daily/page.tsx

'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the game component to prevent SSR issues with localStorage
const DailyPuzzle = dynamic(
  () => import('../../../apps/picturepuzzle/modes/daily/page'),
  { ssr: false }
);

export default function DailyPuzzlePage() {
  return <DailyPuzzle />;
}