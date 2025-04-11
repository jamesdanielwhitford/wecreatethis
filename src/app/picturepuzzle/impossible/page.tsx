// src/app/picturepuzzle/impossible/page.tsx

'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the game component to prevent SSR issues with localStorage
const ImpossiblePuzzle = dynamic(
  () => import('../../../apps/picturepuzzle/modes/impossible/page'),
  { ssr: false }
);

export default function ImpossiblePuzzlePage() {
  return <ImpossiblePuzzle />;
}