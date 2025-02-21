// src/apps/bossbitch/hooks/useGoalData.ts
import { useState, useEffect, useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import { getEntryKey, getMonthKey } from '../services/data/types';
import { IncomeSource } from '../types/goal.types';

interface UseGoalDataProps {
  initialDate?: Date;
}

export default function useGoalData({ initialDate = new Date() }: UseGoalDataProps = {}) {
  const { 
    goals,
    preferences,
    addIncomeToDay,
    updateGoals,
    isLoading,
    setIsLoading
  } = useData();

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [dailyData, setDailyData] = useState<{
    progress: number;
    segments: IncomeSource[];
  }>({ progress: 0, segments: [] });

  const [monthlyData, setMonthlyData] = useState<{
    progress: number;
    segments: IncomeSource[];
  }>({ progress: 0, segments: [] });

  // Load daily and monthly data for the selected date
  const loadData = useCallback(async () => {
    if (!goals) return;
    
    setIsLoading(true);
    try {
      // Get selected day's data
      const dailyEntryKey = getEntryKey(selectedDate);
      const dataService = await import('../services/data/dataService').then(mod => mod.dataService);
      const dailyEntry = await dataService.getDailyEntry(selectedDate);
      
      if (dailyEntry) {
        setDailyData({
          progress: dailyEntry.progress,
          segments: dailyEntry.segments
        });
      } else {
        setDailyData({ progress: 0, segments: [] });
      }
      
      // Get selected month's data
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      const monthlyEntry = await dataService.getMonthlyEntry(year, month);
      
      if (monthlyEntry) {
        setMonthlyData({
          progress: monthlyEntry.progress,
          segments: monthlyEntry.segments
        });
      } else {
        setMonthlyData({ progress: 0, segments: [] });
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, goals, setIsLoading]);

  // Load data when dependencies change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Add income to the current day
  const addIncome = useCallback(async (amount: number, source: IncomeSource) => {
    setIsLoading(true);
    try {
      await addIncomeToDay(selectedDate, amount, source);
      await loadData(); // Reload data after adding income
    } catch (error) {
      console.error('Error adding income:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, addIncomeToDay, loadData, setIsLoading]);

  // Update goals
  const updateGoalSettings = useCallback(async ({
    dailyGoal,
    monthlyGoal,
    activeDays
  }: {
    dailyGoal?: number;
    monthlyGoal?: number;
    activeDays?: boolean[];
  }) => {
    setIsLoading(true);
    try {
      const updates: any = {};
      
      if (dailyGoal !== undefined) {
        updates.dailyGoal = dailyGoal;
      }
      
      if (monthlyGoal !== undefined) {
        updates.monthlyGoal = monthlyGoal;
      }
      
      if (activeDays !== undefined) {
        updates.activeDays = activeDays;
      }
      
      await updateGoals(updates);
    } catch (error) {
      console.error('Error updating goals:', error);
    } finally {
      setIsLoading(false);
    }
  }, [updateGoals, setIsLoading]);

  return {
    selectedDate,
    setSelectedDate,
    dailyData,
    monthlyData,
    dailyGoal: goals?.dailyGoal || 0,
    monthlyGoal: goals?.monthlyGoal || 0,
    activeDays: goals?.activeDays || [false, true, true, true, true, true, false],
    dailyRingColor: preferences?.colors.dailyRing || '#FF0000',
    monthlyRingColor: preferences?.colors.monthlyRing || '#FFD700',
    accentColor: preferences?.colors.accent || '#7C3AED',
    addIncome,
    updateGoalSettings,
    isLoading,
    reload: loadData
  };
}