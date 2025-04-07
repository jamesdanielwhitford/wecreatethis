// src/app/15puzzle/infinite/page.tsx

'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the game component to prevent SSR issues with localStorage
const InfinitePuzzle = dynamic(
  () => import('../../../apps/fifteenpuzzle/modes/infinite/page'),
  { ssr: false }
);

export default function InfinitePuzzlePage() {
  return <InfinitePuzzle />;
}