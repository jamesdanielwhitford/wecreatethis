import React from 'react';
import ProgressRing from '../../ProgressRing';
import { DailyEntry } from '../../../services/data/types';
import styles from '../styles.module.css';

interface WeekStripProps {
  weekDays: Date[];
  selectedDate: Date;
  dailyRingColor: string;
  getGoalData: (date: Date) => DailyEntry | null;
  onDateSelect: (date: Date) => void;
  dailyGoal?: number; // Add dailyGoal prop to use as maxValue
}

const WeekStrip: React.FC<WeekStripProps> = ({
  weekDays,
  selectedDate,
  dailyRingColor,
  getGoalData,
  onDateSelect,
  dailyGoal = 1 // Default to 1 if not provided
}) => {
  const today = new Date();
  
  return (
    <div className={styles.weekStrip}>
      {weekDays.map((day, index) => {
        const dayGoal = getGoalData(day);
        const isActive = day.toDateString() === selectedDate.toDateString();
        const isCurrentDay = day.toDateString() === today.toDateString();
        // Fix: Handle both null and undefined cases
        const hasData = Boolean(dayGoal?.progress);
        
        return (
          <div
            key={index}
            className={`${styles.weekDay} ${isActive ? styles.activeWeekDay : ''}`}
            onClick={() => onDateSelect(day)}
          >
            <span className={styles.weekDayLabel}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'][day.getDay()]}
            </span>
            {isActive ? (
              <div className={styles.activeWeekDayHighlight}>
                <span className={styles.weekDayNumberActive}>
                  {day.getDate()}
                </span>
              </div>
            ) : (
              <span className={styles.weekDayNumber}>
                {day.getDate()}
              </span>
            )}
            <div className={styles.miniRing}>
              <ProgressRing
                progress={dayGoal?.progress || 0}
                maxValue={dailyGoal} // Use the dailyGoal prop instead of trying to get maxValue from dayGoal
                color={isCurrentDay ? dailyRingColor : '#888888'}
                size={30}
                strokeWidth={3}
                segments={dayGoal?.segments}
                animate={false}
                emptyRing={!hasData}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default WeekStrip;