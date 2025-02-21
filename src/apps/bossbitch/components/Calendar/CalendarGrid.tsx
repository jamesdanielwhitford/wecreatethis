'use client';

// src/apps/bossbitch/components/Calendar/CalendarGrid.tsx
import React from 'react';
import CalendarRing from './CalendarRing';
import { IncomeSource } from '../../types/goal.types';
import styles from './styles.module.css';

interface GoalData {
  date: Date;
  progress: number;
  maxValue: number;
  segments?: IncomeSource[];
}

interface CalendarGridProps {
  type: 'daily' | 'monthly';
  month: number;
  year: number;
  goals: GoalData[];
  selectedDate?: Date;
  onDateSelect: (date: Date) => void;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({
  type,
  month,
  year,
  goals,
  selectedDate,
  onDateSelect,
}) => {
  const today = new Date();
  
  // For monthly view, generate an array of 12 months
  const getMonthArray = () => {
    return Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));
  };

  // For daily view, generate array of days in month including empty slots
  const getDaysArray = () => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const result = [];

    // Add empty cells for days before the first of the month
    for (let i = 0; i < firstDay.getDay(); i++) {
      result.push(null);
    }

    // Add all days in the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      result.push(new Date(year, month, i));
    }

    return result;
  };

  // Get appropriate dates array based on type
  const dates = type === 'monthly' ? getMonthArray() : getDaysArray();

  // Find goal data for a specific date
  const getGoalData = (date: Date): GoalData | undefined => {
    if (!date) return undefined;
    
    return goals.find(goal => {
      if (type === 'monthly') {
        return (
          goal.date.getMonth() === date.getMonth() &&
          goal.date.getFullYear() === date.getFullYear()
        );
      }
      return goal.date.toDateString() === date.toDateString();
    });
  };

  // Check if a date is today
  const isToday = (date: Date): boolean => {
    if (!date) return false;
    return date.toDateString() === today.toDateString();
  };

  // Check if a date is selected
  const isSelected = (date: Date): boolean => {
    if (!date || !selectedDate) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  // Get the month name for the current grid section
  const getMonthName = (month: number): string => {
    return new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(year, month));
  };

  // Determine if we need to show month separators
  const showMonthSeparators = type === 'daily';

  // Group dates by month (for daily view) to add month headers
  const groupedDates = () => {
    if (type === 'monthly') return { [month]: dates };
    
    const grouped: { [key: string]: (Date | null)[] } = {};
    
    // Initialize the current month
    grouped[month] = [];
    
    // Add all dates to the appropriate month
    dates.forEach(date => {
      if (date === null) {
        // Add empty slots to the current month
        grouped[month].push(null);
      } else {
        const dateMonth = date.getMonth();
        if (!grouped[dateMonth]) {
          grouped[dateMonth] = [];
        }
        grouped[dateMonth].push(date);
      }
    });
    
    return grouped;
  };

  // Render the grid with potential month headers
  const renderGrid = () => {
    const grouped = groupedDates();
    
    return Object.entries(grouped).map(([monthKey, monthDates]) => {
      const monthNum = parseInt(monthKey);
      
      return (
        <div key={`month-${monthNum}`} className={styles.monthSection}>
          {showMonthSeparators && (
            <div className={styles.monthHeader}>
              {getMonthName(monthNum)}
            </div>
          )}
          
          <div className={type === 'monthly' ? styles.monthsGrid : styles.daysGrid}>
            {monthDates.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className={styles.emptyCell} />;
              }

              const goalData = getGoalData(date);
              const isDateToday = isToday(date);
              const isDateSelected = isSelected(date);
              
              return (
                <CalendarRing
                  key={date.toISOString()}
                  type={type}
                  date={date}
                  progress={goalData?.progress || 0}
                  maxValue={goalData?.maxValue || 0}
                  segments={goalData?.segments}
                  isSelected={isDateSelected}
                  isToday={isDateToday}
                  onClick={() => onDateSelect(date)}
                />
              );
            })}
          </div>
        </div>
      );
    });
  };

  return (
    <div className={styles.calendarGridContainer}>
      {type === 'daily' && (
        <div className={styles.weekdayHeader}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
            <div key={day} className={styles.weekdayLabel}>
              {day}
            </div>
          ))}
        </div>
      )}
      
      {renderGrid()}
    </div>
  );
};

export default CalendarGrid;