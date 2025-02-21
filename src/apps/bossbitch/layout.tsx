// src/app/bossbitch/layout.tsx
import React from 'react';

export default function BossBitchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-900">
      {children}
    </div>
  );
}