// src/apps/openmind/components/MonthView/index.tsx

import React, { useState, useEffect } from 'react';
import styles from './styles.module.css';

interface MonthViewProps {
  currentDate: Date;
  onDateSelect: (date: Date) => void;
}

const MonthView: React.FC<MonthViewProps> = ({ currentDate, onDateSelect }) => {
  const [daysWithEntries, setDaysWithEntries] = useState<Set<string>>(new Set());

  useEffect(() => {
    // TODO: Fetch days with entries for this month
    // For now, we'll use a placeholder
    const fetchDaysWithEntries = async () => {
      try {
        const response = await fetch(`/api/openmind/days-with-entries?year=${currentDate.getFullYear()}&month=${currentDate.getMonth()}`);
        if (response.ok) {
          const days = await response.json();
          setDaysWithEntries(new Set(days.map((d: string) => d)));
        }
      } catch (error) {
        console.error('Error fetching days with entries:', error);
      }
    };

    fetchDaysWithEntries();
  }, [currentDate]);

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isFutureDate = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    return date > today;
  };

  const hasEntries = (date: Date | null) => {
    if (!date) return false;
    return daysWithEntries.has(date.toISOString().split('T')[0]);
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.monthTitle}>{monthName}</h3>
      </div>

      <div className={styles.calendar}>
        <div className={styles.weekDays}>
          {weekDays.map(day => (
            <div key={day} className={styles.weekDay}>
              {day}
            </div>
          ))}
        </div>

        <div className={styles.daysGrid}>
          {getDaysInMonth().map((date, index) => (
            <div
              key={index}
              className={`${styles.dayCell} ${
                date ? styles.validDay : styles.emptyDay
              } ${
                date && isToday(date) ? styles.today : ''
              } ${
                date && isFutureDate(date) ? styles.futureDay : ''
              } ${
                date && hasEntries(date) ? styles.hasEntries : ''
              }`}
              onClick={() => {
                if (date && !isFutureDate(date)) {
                  onDateSelect(date);
                }
              }}
            >
              {date && (
                <>
                  <span className={styles.dayNumber}>{date.getDate()}</span>
                  {hasEntries(date) && (
                    <div className={styles.entriesIndicator} />
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <div className={`${styles.legendDot} ${styles.todayDot}`} />
          <span>Today</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.legendDot} ${styles.entriesDot}`} />
          <span>Has entries</span>
        </div>
      </div>
    </div>
  );
};

export default MonthView;