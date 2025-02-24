// Modified version of EditGoalsModal
// src/apps/bossbitch/components/EditGoalsModal/index.tsx

'use client';

import React, { useState } from 'react';
import { X, Calculator } from 'lucide-react';
import { formatZAR, parseZAR, createCurrencyInputHandler } from '../../utils/currency';
import { useData } from '../../contexts/DataContext';
import LoadingIndicator from '../LoadingIndicator';
import styles from './styles.module.css';

interface EditGoalsModalProps {
  onClose: () => void;
  onSave: (settings: {
    monthlyGoal: number;
    dailyGoal: number;
    activeDays: boolean[];
  }) => void;
  currentMonthlyGoal: number;
  currentDailyGoal: number;
  initialActiveDays?: boolean[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EditGoalsModal: React.FC<EditGoalsModalProps> = ({
  onClose,
  onSave,
  currentMonthlyGoal,
  currentDailyGoal,
  initialActiveDays = [false, true, true, true, true, true, false] // Default: Mon-Fri
}) => {
  const { isLoading } = useData();
  const [monthlyGoal, setMonthlyGoal] = useState(formatZAR(currentMonthlyGoal));
  const [dailyGoal, setDailyGoal] = useState(formatZAR(currentDailyGoal));
  const [activeDays, setActiveDays] = useState<boolean[]>(initialActiveDays);
  const [isCustomDaily, setIsCustomDaily] = useState(false);
  const [error, setError] = useState('');

  // Create currency input handlers that preserve cursor position
  const handleMonthlyGoalChange = createCurrencyInputHandler(setMonthlyGoal);
  const handleDailyGoalChange = createCurrencyInputHandler((value) => {
    setDailyGoal(value);
    setIsCustomDaily(true);
  });

  // Calculate daily goal based on monthly goal and active days
  const calculateDailyGoal = () => {
    const monthlyAmount = parseZAR(monthlyGoal);
    if (isNaN(monthlyAmount)) return;

    const activeDaysCount = activeDays.filter(Boolean).length;
    if (activeDaysCount === 0) {
      setError('Please select at least one active day');
      return;
    }

    // Calculate average workdays per month (considering 52 weeks per year)
    const avgWorkdaysPerMonth = (activeDaysCount * 52) / 12;
    const calculatedDaily = monthlyAmount / avgWorkdaysPerMonth;

    setDailyGoal(formatZAR(Math.ceil(calculatedDaily)));
    setIsCustomDaily(false);
    setError('');
  };

  // Toggle day selection
  const toggleDay = (index: number) => {
    const newActiveDays = [...activeDays];
    newActiveDays[index] = !newActiveDays[index];
    setActiveDays(newActiveDays);
    
    // Recalculate daily goal if not using custom value
    if (!isCustomDaily && newActiveDays.filter(Boolean).length > 0) {
      setTimeout(calculateDailyGoal, 0);
    }
  };

  // Handle save
  const handleSave = () => {
    const parsedMonthly = parseZAR(monthlyGoal);
    const parsedDaily = parseZAR(dailyGoal);

    if (isNaN(parsedMonthly) || parsedMonthly <= 0) {
      setError('Please enter a valid monthly goal');
      return;
    }

    if (isNaN(parsedDaily) || parsedDaily <= 0) {
      setError('Please enter a valid daily goal');
      return;
    }

    if (!activeDays.some(Boolean)) {
      setError('Please select at least one active day');
      return;
    }

    onSave({
      monthlyGoal: parsedMonthly,
      dailyGoal: parsedDaily,
      activeDays
    });
  };

  return (
    <div className={styles.modal}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Edit Goals</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Monthly Goal Input */}
        <div className={styles.inputGroup}>
          <label className={styles.label}>Monthly Goal</label>
          <input
            type="text"
            value={monthlyGoal}
            onChange={handleMonthlyGoalChange}
            placeholder="R 0.00"
            className={styles.input}
          />
        </div>

        {/* Active Days Selection */}
        <div className={styles.inputGroup}>
          <label className={styles.label}>Active Days</label>
          <div className={styles.daysGrid}>
            {DAYS.map((day, index) => (
              <button
                key={day}
                onClick={() => toggleDay(index)}
                className={`${styles.dayButton} ${activeDays[index] ? styles.active : ''}`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Daily Goal Section */}
        <div className={styles.inputGroup}>
          <div className={styles.dailyGoalHeader}>
            <label className={styles.label}>Daily Goal</label>
            <button
              onClick={calculateDailyGoal}
              className={styles.calculateButton}
              disabled={isLoading}
            >
              <Calculator className="w-4 h-4" />
              Calculate
            </button>
          </div>
          
          <input
            type="text"
            value={dailyGoal}
            onChange={handleDailyGoalChange}
            placeholder="R 0.00"
            className={styles.input}
          />
          
          {isCustomDaily && (
            <p className={styles.customWarning}>
              ⚠️ Using custom daily goal
            </p>
          )}
        </div>

        {error && (
          <p className={styles.error}>{error}</p>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          className={styles.submitButton}
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : 'Save Goals'}
        </button>
      </div>
      
      {/* Loading Indicator */}
      {isLoading && <LoadingIndicator fullScreen size="small" text="Saving goals..." />}
    </div>
  );
};

export default EditGoalsModal;