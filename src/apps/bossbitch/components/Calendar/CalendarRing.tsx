'use client';

// src/apps/bossbitch/components/Calendar/CalendarRing.tsx
import React from 'react';
import { IncomeSource } from '../../types/goal.types';
import ProgressRing from '../ProgressRing';
import { formatZAR } from '../../utils/currency';
import styles from './styles.module.css';

interface CalendarRingProps {
  date: Date;
  progress: number;
  maxValue: number;
  segments?: IncomeSource[];
  isSelected?: boolean;
  isToday?: boolean;
  onClick?: () => void;
  type: 'daily' | 'monthly';
}

const CalendarRing: React.FC<CalendarRingProps> = ({
  date,
  progress,
  maxValue,
  segments,
  isSelected = false,
  isToday = false,
  onClick,
  type
}) => {
  // Use the same colors as main rings based on type
  const ringColor = type === 'daily' ? '#FF0000' : '#FFD700';
  
  // Calculate ring size based on type
  const ringSize = type === 'monthly' ? 60 : 40;
  const strokeWidth = type === 'monthly' ? 6 : 4;
  
  // Format display text based on type
  const getDisplayText = () => {
    if (type === 'daily') {
      return date.getDate().toString();
    }
    return new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
  };

  // Determine if there's goal data
  const hasData = progress > 0;

  return (
    <div 
      onClick={onClick}
      className={`
        ${styles.ringCell}
        ${isSelected ? styles.selected : ''}
        ${isToday ? styles.today : ''}
      `}
    >
      <div className={styles.miniRing}>
        <ProgressRing
          progress={progress}
          maxValue={maxValue}
          color={ringColor}
          size={ringSize}
          strokeWidth={strokeWidth}
          segments={segments}
          animate={false}
        />
      </div>
      
      <span className={styles.dateLabel}>
        {getDisplayText()}
      </span>

      {hasData && (
        <div className={styles.tooltip}>
          {formatZAR(progress)} / {formatZAR(maxValue)}
        </div>
      )}
    </div>
  );
};

export default CalendarRing;