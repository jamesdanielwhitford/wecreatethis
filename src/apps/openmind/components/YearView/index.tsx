// src/apps/openmind/components/YearView/index.tsx

import React, { useState, useEffect } from 'react';
import styles from './styles.module.css';

interface YearViewProps {
  currentDate: Date;
  onMonthSelect: (month: number) => void;
}

const YearView: React.FC<YearViewProps> = ({ currentDate, onMonthSelect }) => {
  const [monthsWithEntries, setMonthsWithEntries] = useState<Set<number>>(new Set());

  useEffect(() => {
    // TODO: Fetch months with entries for this year
    const fetchMonthsWithEntries = async () => {
      try {
        const response = await fetch(`/api/openmind/months-with-entries?year=${currentDate.getFullYear()}`);
        if (response.ok) {
          const months = await response.json();
          setMonthsWithEntries(new Set(months));
        }
      } catch (error) {
        console.error('Error fetching months with entries:', error);
      }
    };

    fetchMonthsWithEntries();
  }, [currentDate]);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = currentDate.getFullYear();
  const currentMonth = new Date().getMonth();
  const currentMonthYear = new Date().getFullYear();

  const isCurrentMonth = (monthIndex: number) => {
    return monthIndex === currentMonth && currentYear === currentMonthYear;
  };

  const isFutureMonth = (monthIndex: number) => {
    const today = new Date();
    const monthDate = new Date(currentYear, monthIndex, 1);
    return monthDate > today;
  };

  const hasEntries = (monthIndex: number) => {
    return monthsWithEntries.has(monthIndex);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.yearTitle}>{currentYear}</h3>
      </div>

      <div className={styles.monthsGrid}>
        {months.map((month, index) => (
          <div
            key={month}
            className={`${styles.monthCard} ${
              isCurrentMonth(index) ? styles.currentMonth : ''
            } ${
              isFutureMonth(index) ? styles.futureMonth : ''
            } ${
              hasEntries(index) ? styles.hasEntries : ''
            }`}
            onClick={() => {
              if (!isFutureMonth(index)) {
                onMonthSelect(index);
              }
            }}
          >
            <div className={styles.monthName}>{month}</div>
            <div className={styles.monthMeta}>
              {hasEntries(index) && (
                <div className={styles.entriesIndicator}>
                  <span className={styles.entriesCount}>•</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <div className={`${styles.legendDot} ${styles.currentDot}`} />
          <span>Current month</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.legendDot} ${styles.entriesDot}`} />
          <span>Has entries</span>
        </div>
      </div>
    </div>
  );
};

export default YearView;