// src/apps/bossbitch/services/data/types.ts
import { IncomeSource } from '../../types/goal.types';

export interface UserGoals {
  dailyGoal: number;
  monthlyGoal: number;
  activeDays: boolean[];
}

export interface UserPreferences {
  isDarkMode: boolean;
  colors: {
    dailyRing: string;
    monthlyRing: string;
    accent: string;
  };
}

export interface DailyEntry {
  date: string; // ISO date string (YYYY-MM-DD)
  progress: number;
  segments: IncomeSource[];
}

export interface MonthlyEntry {
  year: number;
  month: number; // 0-11 (Jan-Dec)
  monthKey: string; // Format: 'YYYY-MM'
  progress: number;
  segments: IncomeSource[];
}

export interface UserData {
  goals: UserGoals;
  preferences: UserPreferences;
  dailyEntries: Record<string, DailyEntry>; // Keyed by ISO date
  monthlyEntries: Record<string, MonthlyEntry>; // Keyed by 'YYYY-MM'
  incomeSources: IncomeSource[];
}

// Default data
export const DEFAULT_USER_DATA: UserData = {
  goals: {
    dailyGoal: 2000,
    monthlyGoal: 30000,
    activeDays: [false, true, true, true, true, true, false], // Mon-Fri are active
  },
  preferences: {
    isDarkMode: true,
    colors: {
      dailyRing: '#FF0000',
      monthlyRing: '#FFD700',
      accent: '#7C3AED',
    },
  },
  dailyEntries: {},
  monthlyEntries: {},
  incomeSources: [
    { id: 'freelance', name: 'Freelance', value: 0, color: '#FF6B6B' },
    { id: 'parttime', name: 'Part Time', value: 0, color: '#4ECDC4' },
    { id: 'other', name: 'Other', value: 0, color: '#45B7D1' },
  ],
};

// Utility functions
export function getEntryKey(date: Date): string {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

export function getMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function parseMonthKey(key: string): { year: number; month: number } {
  const [yearStr, monthStr] = key.split('-');
  return {
    year: parseInt(yearStr),
    month: parseInt(monthStr),
  };
}