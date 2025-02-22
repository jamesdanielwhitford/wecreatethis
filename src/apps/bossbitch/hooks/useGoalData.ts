// src/apps/bossbitch/hooks/useGoalData.ts
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { IncomeSource } from '../types/goal.types';
import { getEntryKey } from '../services/data/types';

interface DailyData {
  progress: number;
  segments: IncomeSource[];
}

interface MonthlyData {
  progress: number;
  segments: IncomeSource[];
}

interface UseGoalDataProps {
  initialDate?: Date;
}

const useGoalData = (props?: UseGoalDataProps) => {
  // Get correct function names from context
  const { 
    goals,
    updateGoals,
    addIncomeToDay,
    incomeSources,
    isLoading,
    setIsLoading
  } = useData();

  const [monthlyGoal, setMonthlyGoal] = useState<number>(0);
  const [dailyGoal, setDailyGoal] = useState<number>(0);
  const [originalDailyGoal, setOriginalDailyGoal] = useState<number>(0);
  const [activeDays, setActiveDays] = useState<boolean[]>([false, true, true, true, true, true, false]);
  const [dailyData, setDailyData] = useState<DailyData>({ progress: 0, segments: [] });
  const [monthlyData, setMonthlyData] = useState<MonthlyData>({ progress: 0, segments: [] });
  const [remainingDaysInMonth, setRemainingDaysInMonth] = useState<number>(0);
  const [remainingActiveWorkdays, setRemainingActiveWorkdays] = useState<number>(0);
  const [monthlyDeficit, setMonthlyDeficit] = useState<number>(0);
  const [isDataReady, setIsDataReady] = useState<boolean>(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  
  // Add selected date state
  const [selectedDate, setSelectedDate] = useState<Date>(props?.initialDate || new Date());

  // Colors for the rings
  const dailyRingColor = "#FF0000"; // Red
  const monthlyRingColor = "#FFD700"; // Gold

  // Function to get today's date formatted as a string
  const getTodayDateString = () => {
    const today = new Date();
    return getEntryKey(today);
  };

  // Function to get current month formatted as year-month
  const getCurrentMonthString = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}`;
  };
  
  // Load initial goals data
  useEffect(() => {
    const loadGoals = async () => {
      try {
        if (goals) {
          setMonthlyGoal(goals.monthlyGoal);
          setDailyGoal(goals.dailyGoal);
          setOriginalDailyGoal(goals.dailyGoal);
          setActiveDays(goals.activeDays || [false, true, true, true, true, true, false]); // Fallback
          setIsDataReady(true);
        }
      } catch (error) {
        console.error('Failed to load goals:', error);
      }
    };

    loadGoals();
  }, [goals]);

  // Fetch daily and monthly data
  const fetchData = async () => {
    if (!isDataReady) return;
    
    try {
      setIsLoading(true);
      const today = new Date();
      
      // For simplicity, we'll manually fetch the daily entries for today from local storage
      // In a real implementation, you would use your data service API
      if (typeof window !== 'undefined') {
        // Try to get daily data
        const storageData = localStorage.getItem('bossbitch_data');
        if (storageData) {
          const data = JSON.parse(storageData);
          const todayKey = getTodayDateString();
          const monthKey = getCurrentMonthString();
          
          // Get daily entry if it exists
          if (data.dailyEntries && data.dailyEntries[todayKey]) {
            setDailyData({
              progress: data.dailyEntries[todayKey].progress || 0,
              segments: data.dailyEntries[todayKey].segments || []
            });
          } else {
            setDailyData({ progress: 0, segments: [] });
          }
          
          // Get monthly entry if it exists
          if (data.monthlyEntries && data.monthlyEntries[monthKey]) {
            setMonthlyData({
              progress: data.monthlyEntries[monthKey].progress || 0,
              segments: data.monthlyEntries[monthKey].segments || []
            });
          } else {
            setMonthlyData({ progress: 0, segments: [] });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
      setLastRefreshTime(Date.now());
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (isDataReady) {
      fetchData();
    }
  }, [isDataReady]);

  // Calculate remaining days and active workdays in the month
  useEffect(() => {
    const calculateRemainingDays = async () => {
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      // Last day of current month
      const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      
      // Calculate remaining days in this month (including today)
      const remainingDays = lastDayOfMonth - today.getDate() + 1;
      setRemainingDaysInMonth(remainingDays);
      
      // Calculate remaining active workdays in this month (excluding today if it's already done)
      let remainingWorkdays = 0;
      const todayDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const isTodayActive = activeDays[todayDayOfWeek];
      const isTodayCompleted = dailyData.progress >= dailyGoal;
      
      // Check each remaining day in the month
      for (let day = isTodayActive && !isTodayCompleted ? 0 : 1; day < remainingDays; day++) {
        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + day);
        const futureDayOfWeek = futureDate.getDay();
        
        if (activeDays[futureDayOfWeek]) {
          remainingWorkdays++;
        }
      }
      
      setRemainingActiveWorkdays(remainingWorkdays);
      
      // Calculate current deficit/surplus for the month
      const targetProgressToDate = monthlyGoal - (remainingWorkdays * originalDailyGoal);
      const deficit = targetProgressToDate - monthlyData.progress;
      setMonthlyDeficit(deficit);
    };
    
    if (activeDays.length > 0 && dailyGoal > 0 && isDataReady && monthlyGoal > 0) {
      calculateRemainingDays();
    }
  }, [activeDays, dailyGoal, monthlyGoal, originalDailyGoal, dailyData, monthlyData, isDataReady, lastRefreshTime]);

  // Dynamically adjust daily goal based on progress
  useEffect(() => {
    if (remainingActiveWorkdays > 0 && monthlyDeficit !== 0) {
      // Calculate new daily goal based on remaining deficit distributed across remaining active days
      const adjustedDailyGoal = originalDailyGoal + (monthlyDeficit / remainingActiveWorkdays);
      
      // Ensure the adjusted goal is never negative
      setDailyGoal(Math.max(0, adjustedDailyGoal));
    } else if (remainingActiveWorkdays === 0 && monthlyData.progress < monthlyGoal) {
      // Special case: If no active days left but still haven't met monthly goal,
      // today becomes the last chance regardless of whether it's marked active
      const remainingForMonth = monthlyGoal - monthlyData.progress;
      setDailyGoal(remainingForMonth > 0 ? remainingForMonth : 0);
    }
  }, [remainingActiveWorkdays, monthlyDeficit, originalDailyGoal, monthlyData, monthlyGoal]);

  // Handle adding income - this now maps to addIncomeToDay from context
  const handleAddIncome = async (amount: number, source: IncomeSource) => {
    try {
      const today = new Date();
      await addIncomeToDay(today, amount, source);
      
      // Refresh data after adding income
      await fetchData();
      
      return true;
    } catch (error) {
      console.error('Error adding income:', error);
      throw error;
    }
  };

  // This maps to updateGoals from your context
  const handleUpdateGoalSettings = async (settings: {
    monthlyGoal: number;
    dailyGoal: number;
    activeDays: boolean[];
  }) => {
    try {
      await updateGoals(settings);
      setMonthlyGoal(settings.monthlyGoal);
      setDailyGoal(settings.dailyGoal);
      setOriginalDailyGoal(settings.dailyGoal);
      setActiveDays(settings.activeDays);
      
      // Refresh data after updating goals
      await fetchData();
      
      return settings;
    } catch (error) {
      console.error('Failed to update goal settings:', error);
      throw error;
    }
  };

  // Calculate deficit/surplus info for display
  const deficitInfo = useMemo(() => {
    if (monthlyDeficit > 0) {
      return {
        isDeficit: true,
        amount: monthlyDeficit,
        perDay: remainingActiveWorkdays > 0 ? monthlyDeficit / remainingActiveWorkdays : 0,
        message: `You're behind by ${formatCurrency(monthlyDeficit)} for the month`
      };
    } else if (monthlyDeficit < 0) {
      return {
        isDeficit: false,
        amount: Math.abs(monthlyDeficit),
        perDay: remainingActiveWorkdays > 0 ? Math.abs(monthlyDeficit) / remainingActiveWorkdays : 0,
        message: `You're ahead by ${formatCurrency(Math.abs(monthlyDeficit))} for the month`
      };
    }
    return {
      isDeficit: false,
      amount: 0,
      perDay: 0,
      message: "You're exactly on track!"
    };
  }, [monthlyDeficit, remainingActiveWorkdays]);

  // Simple currency formatter for deficitInfo message
  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2
    }).format(value).replace('ZAR', 'R');
  }

  return {
    dailyData,
    monthlyData,
    dailyGoal,
    originalDailyGoal,
    monthlyGoal,
    activeDays,
    dailyRingColor,
    monthlyRingColor,
    addIncome: handleAddIncome,
    updateGoalSettings: handleUpdateGoalSettings,
    isLoading,
    isDataReady,
    remainingDaysInMonth,
    remainingActiveWorkdays,
    deficitInfo,
    refreshData: fetchData,
    // Add the selected date state and setter
    selectedDate,
    setSelectedDate
  };
};

export default useGoalData;