// src/app/15puzzle/page.tsx

'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PuzzlePage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the daily mode by default
    router.push('/15puzzle/daily');
  }, [router]);
  
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p>Redirecting to daily puzzle...</p>
    </div>
  );
}

