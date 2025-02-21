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
  
  // Calculate completion percentage
  const completionPercentage = maxValue > 0 ? Math.min((progress / maxValue) * 100, 100) : 0;

  // Determine cell classes based on state
  const cellClasses = [
    styles.ringCell,
    isSelected ? styles.selected : '',
    isToday ? styles.today : '',
    hasData ? styles.hasData : '',
  ].filter(Boolean).join(' ');

  return (
    <div 
      onClick={onClick}
      className={cellClasses}
    >
      {type === 'daily' && (
        <div className={styles.dateDisplay}>
          <span className={isToday ? styles.todayDate : ''}>
            {getDisplayText()}
          </span>
        </div>
      )}
      
      <div className={styles.ring}>
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
      
      {type === 'monthly' && (
        <div className={styles.monthDisplay}>
          {getDisplayText()}
        </div>
      )}
      
      {hasData && (
        <div className={styles.tooltip}>
          {formatZAR(progress)} / {formatZAR(maxValue)}
          <div className={styles.tooltipProgress}>
            <div 
              className={styles.tooltipProgressBar} 
              style={{width: `${completionPercentage}%`}}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarRing;