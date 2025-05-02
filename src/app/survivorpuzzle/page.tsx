'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import styles from './page.module.css';

// Dynamic import to handle client-side only components
const SurvivorPuzzle = dynamic(
  () => import('@/apps/survivorpuzzle/components/SurvivorPuzzle'),
  { ssr: false }
);

export default function SurvivorPuzzlePage() {
  return (
    <div className={styles.container}>
      <SurvivorPuzzle />
    </div>
  );
}