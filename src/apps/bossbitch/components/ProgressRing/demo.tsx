'use client';

// src/apps/bossbitch/components/ProgressRing/demo.tsx
import React, { useState } from 'react';
import ProgressRing from './index';
import { formatZAR } from '../../utils/currency';
import { IncomeSource } from '../../types/goal.types';

const ProgressRingDemo = () => {
  const [dailyValue, setDailyValue] = useState(1000);
  const [monthlyValue, setMonthlyValue] = useState(13777.98);
  const dailyMax = 2000;
  const monthlyMax = 30000;

  const dailySegments: IncomeSource[] = [
    { id: 'freelance', name: 'Freelance', value: 500, color: '#FF6B6B' },
    { id: 'parttime', name: 'Part Time', value: 300, color: '#4ECDC4' },
    { id: 'other', name: 'Other', value: 200, color: '#45B7D1' },
  ];

  const monthlySegments: IncomeSource[] = [
    { id: 'freelance', name: 'Freelance', value: 8000, color: '#FFD700' },
    { id: 'parttime', name: 'Part Time', value: 4000, color: '#FFA500' },
    { id: 'other', name: 'Other', value: 1777.98, color: '#FF8C00' },
  ];

  const CardWrapper = ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-white mb-4">{title}</h2>
      <div className="relative bg-zinc-900 rounded-2xl p-6">
        {children}
      </div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto">
      {/* Daily Goal Card */}
      <CardWrapper title="Daily Goal">
        <div className="flex flex-col items-center">
          <ProgressRing
            progress={dailyValue}
            maxValue={dailyMax}
            color="#FF0000"
            size={240}
            strokeWidth={24}
            segments={dailySegments}
            className="mb-4"
          />
          <div className="text-lg text-white">
            {formatZAR(dailyValue)}
          </div>
        </div>
      </CardWrapper>

      {/* Monthly Goal Card */}
      <CardWrapper title="Monthly Goal">
        <div className="flex flex-col items-center">
          <ProgressRing
            progress={monthlyValue}
            maxValue={monthlyMax}
            color="#FFD700"
            size={240}
            strokeWidth={24}
            segments={monthlySegments}
            className="mb-4"
          />
          <div className="text-lg text-white">
            {formatZAR(monthlyValue)} / {formatZAR(monthlyMax)}
          </div>
        </div>
      </CardWrapper>

      {/* Test Controls Card */}
      <CardWrapper title="Test Controls">
        <div className="space-y-6">
          <div>
            <p className="text-gray-400 mb-2">Daily Goal:</p>
            <div className="grid grid-cols-2 gap-4">
              <button
                className="px-4 py-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition-colors"
                onClick={() => setDailyValue(Math.max(0, dailyValue - 100))}
              >
                -100
              </button>
              <button
                className="px-4 py-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition-colors"
                onClick={() => setDailyValue(Math.min(dailyMax * 1.5, dailyValue + 100))}
              >
                +100
              </button>
            </div>
          </div>
          <div>
            <p className="text-gray-400 mb-2">Monthly Goal:</p>
            <div className="grid grid-cols-2 gap-4">
              <button
                className="px-4 py-2 bg-yellow-500/20 text-yellow-500 rounded-lg hover:bg-yellow-500/30 transition-colors"
                onClick={() => setMonthlyValue(Math.max(0, monthlyValue - 1000))}
              >
                -1000
              </button>
              <button
                className="px-4 py-2 bg-yellow-500/20 text-yellow-500 rounded-lg hover:bg-yellow-500/30 transition-colors"
                onClick={() => setMonthlyValue(Math.min(monthlyMax * 1.5, monthlyValue + 1000))}
              >
                +1000
              </button>
            </div>
          </div>
        </div>
      </CardWrapper>
    </div>
  );
};

export default ProgressRingDemo;