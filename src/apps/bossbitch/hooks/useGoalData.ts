// src/apps/bossbitch/hooks/useGoalData.ts
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { IncomeSource } from '../types/goal.types';
import { dataService } from '../services/data/dataService';

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
    setIsLoading,
    refreshAllData,
    lastUpdateTimestamp
  } = useData();

  // Initialize all state with safe default values
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
  const [selectedDate, setSelectedDate] = useState<Date>(props?.initialDate || new Date());

  // Colors for the rings
  const dailyRingColor = "#FF0000"; // Red
  const monthlyRingColor = "#FFD700"; // Gold

  // Load initial goals data
  useEffect(() => {
    const loadGoals = async () => {
      try {
        if (goals) {
          setMonthlyGoal(goals.monthlyGoal || 0);
          setDailyGoal(goals.dailyGoal || 0);
          setOriginalDailyGoal(goals.dailyGoal || 0);
          setActiveDays(goals.activeDays || [false, true, true, true, true, true, false]);
          setIsDataReady(true);
        }
      } catch (error) {
        console.error('Failed to load goals:', error);
        // Set safe defaults in case of error
        setMonthlyGoal(0);
        setDailyGoal(0);
        setOriginalDailyGoal(0);
        setActiveDays([false, true, true, true, true, true, false]);
      }
    };

    loadGoals();
  }, [goals]);

  // Fetch daily and monthly data
  const fetchData = async () => {
    if (!isDataReady) return;
    
    try {
      setIsLoading(true);
      
      // Get daily entry for selected date
      const dailyEntry = await dataService.getDailyEntry(selectedDate);
      setDailyData({
        progress: dailyEntry?.progress || 0,
        segments: Array.isArray(dailyEntry?.segments) ? dailyEntry.segments : []
      });
      
      // Get monthly entry for selected date's month
      const monthlyEntry = await dataService.getMonthlyEntry(
        selectedDate.getFullYear(),
        selectedDate.getMonth()
      );
      setMonthlyData({
        progress: monthlyEntry?.progress || 0,
        segments: Array.isArray(monthlyEntry?.segments) ? monthlyEntry.segments : []
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      // Set safe defaults in case of error
      setDailyData({ progress: 0, segments: [] });
      setMonthlyData({ progress: 0, segments: [] });
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data fetch and refresh when data changes
  useEffect(() => {
    if (isDataReady) {
      console.log('Fetching data due to date change or data update', {
        selectedDate,
        lastUpdateTimestamp
      });
      fetchData();
    }
  }, [isDataReady, selectedDate, lastUpdateTimestamp]);

  // Calculate remaining days and active workdays in the month
  useEffect(() => {
    const calculateRemainingDays = async () => {
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      // Last day of current month
      const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      
      // Calculate remaining days in this month (including today)
      const remainingDays = Math.max(0, lastDayOfMonth - today.getDate() + 1);
      setRemainingDaysInMonth(remainingDays);
      
      // Calculate remaining active workdays
      let remainingWorkdays = 0;
      const todayDayOfWeek = today.getDay();
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
      
      // Calculate current deficit/surplus for the month with safe math
      const safeMonthlyGoal = monthlyGoal || 0;
      const safeOriginalDailyGoal = originalDailyGoal || 0;
      const safeMonthlyProgress = monthlyData.progress || 0;
      const targetProgressToDate = safeMonthlyGoal - (remainingWorkdays * safeOriginalDailyGoal);
      const deficit = targetProgressToDate - safeMonthlyProgress;
      setMonthlyDeficit(deficit);
    };
    
    if (activeDays.length > 0 && isDataReady) {
      calculateRemainingDays();
    }
  }, [activeDays, dailyGoal, monthlyGoal, originalDailyGoal, dailyData, monthlyData, isDataReady, lastUpdateTimestamp]);

  // Dynamically adjust daily goal based on progress
  useEffect(() => {
    if (remainingActiveWorkdays > 0 && monthlyDeficit !== 0) {
      // Calculate new daily goal based on remaining deficit distributed across remaining active days
      const adjustedDailyGoal = (originalDailyGoal || 0) + (monthlyDeficit / remainingActiveWorkdays);
      setDailyGoal(Math.max(0, adjustedDailyGoal));
    } else if (remainingActiveWorkdays === 0 && monthlyData.progress < monthlyGoal) {
      const remainingForMonth = Math.max(0, monthlyGoal - (monthlyData.progress || 0));
      setDailyGoal(remainingForMonth);
    }
  }, [remainingActiveWorkdays, monthlyDeficit, originalDailyGoal, monthlyData, monthlyGoal]);

  // Handle adding income
  const handleAddIncome = async (amount: number, source: IncomeSource, date?: Date) => {
    try {
      const targetDate = date || new Date();
      await addIncomeToDay(targetDate, amount, source);
      await refreshAllData();
      await fetchData();
      return true;
    } catch (error) {
      console.error('Error adding income:', error);
      throw error;
    }
  };

  // Handle goal settings update
  const handleUpdateGoalSettings = async (settings: {
    monthlyGoal: number;
    dailyGoal: number;
    activeDays: boolean[];
  }) => {
    try {
      await updateGoals(settings);
      setMonthlyGoal(settings.monthlyGoal || 0);
      setDailyGoal(settings.dailyGoal || 0);
      setOriginalDailyGoal(settings.dailyGoal || 0);
      setActiveDays(settings.activeDays || [false, true, true, true, true, true, false]);
      await refreshAllData();
      await fetchData();
      return settings;
    } catch (error) {
      console.error('Failed to update goal settings:', error);
      throw error;
    }
  };

  // Calculate deficit/surplus info for display
  const deficitInfo = useMemo(() => {
    const safeMonthlyDeficit = monthlyDeficit || 0;
    const safeRemainingDays = remainingActiveWorkdays || 1;
    
    if (safeMonthlyDeficit > 0) {
      return {
        isDeficit: true,
        amount: safeMonthlyDeficit,
        perDay: safeMonthlyDeficit / safeRemainingDays,
        message: `You're behind by ${formatCurrency(safeMonthlyDeficit)} for the month`
      };
    } else if (safeMonthlyDeficit < 0) {
      return {
        isDeficit: false,
        amount: Math.abs(safeMonthlyDeficit),
        perDay: Math.abs(safeMonthlyDeficit) / safeRemainingDays,
        message: `You're ahead by ${formatCurrency(Math.abs(safeMonthlyDeficit))} for the month`
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
    selectedDate,
    setSelectedDate
  };
};

export default useGoalData;