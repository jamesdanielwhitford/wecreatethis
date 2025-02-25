'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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

// Debug logger for tracking state changes and data flow
const debugLog = (area: string, message: string, data?: unknown): void => {
  if (process.env.NODE_ENV === 'development') {
    console.group(`🔄 ${area}`);
    console.log(`[${new Date().toISOString()}] ${message}`);
    if (data) console.log('Data:', data);
    console.groupEnd();
  }
};

const useGoalData = (props?: UseGoalDataProps) => {
  const { 
    goals,
    updateGoals,
    addIncomeToDay,
    addIncomeSource,
    incomeSources,
    isLoading,
    setIsLoading,
    refreshAllData,
    lastUpdateTimestamp
  } = useData();

  // Create refs to prevent useEffect loops
  const isDataInitialized = useRef(false);
  const adjustmentInProgress = useRef(false);
  
  // Initialize state with safe default values
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
  const [needsRecalculation, setNeedsRecalculation] = useState<boolean>(false);

  // Colors for the rings
  const dailyRingColor = "#FF0000"; // Red
  const monthlyRingColor = "#FFD700"; // Gold

  // Load initial goals data - only called once
  useEffect(() => {
    if (!goals || isDataInitialized.current) return;
    
    debugLog('Initial Load', 'Loading initial goals data', goals);
    try {
      setMonthlyGoal(goals.monthlyGoal || 0);
      setDailyGoal(goals.dailyGoal || 0);
      setOriginalDailyGoal(goals.dailyGoal || 0);
      setActiveDays(goals.activeDays || [false, true, true, true, true, true, false]);
      setIsDataReady(true);
      isDataInitialized.current = true;
      
      debugLog('Initial Load', 'Goals loaded successfully', {
        monthlyGoal: goals.monthlyGoal,
        dailyGoal: goals.dailyGoal,
        activeDays: goals.activeDays
      });
    } catch (error) {
      console.error('Failed to load goals:', error);
      // Set safe defaults in case of error
      setMonthlyGoal(0);
      setDailyGoal(0);
      setOriginalDailyGoal(0);
      setActiveDays([false, true, true, true, true, true, false]);
    }
  }, [goals]);

  // Fetch daily and monthly data - memoized to avoid recreation on every render
  const fetchData = useCallback(async () => {
    if (!isDataReady) {
      debugLog('Data Fetch', 'Skipping fetch - data not ready');
      return;
    }
    
    debugLog('Data Fetch', 'Starting data fetch', { selectedDate });
    
    try {
      setIsLoading(true);
      
      const dailyEntry = await dataService.getDailyEntry(selectedDate);
      debugLog('Daily Data', 'Fetched daily entry', dailyEntry);
      
      setDailyData({
        progress: dailyEntry?.progress || 0,
        segments: Array.isArray(dailyEntry?.segments) ? dailyEntry.segments : []
      });
      
      const monthlyEntry = await dataService.getMonthlyEntry(
        selectedDate.getFullYear(),
        selectedDate.getMonth()
      );
      debugLog('Monthly Data', 'Fetched monthly entry', monthlyEntry);
      
      setMonthlyData({
        progress: monthlyEntry?.progress || 0,
        segments: Array.isArray(monthlyEntry?.segments) ? monthlyEntry.segments : []
      });
      
      // After data is fetched, schedule a recalculation of derived values
      setNeedsRecalculation(true);
    } catch (error) {
      console.error('Error fetching data:', error);
      debugLog('Error', 'Error fetching data', error);
      setDailyData({ progress: 0, segments: [] });
      setMonthlyData({ progress: 0, segments: [] });
    } finally {
      setIsLoading(false);
    }
  }, [isDataReady, selectedDate, setIsLoading]);

  // Data fetch effect - simplify dependencies to avoid loops
  useEffect(() => {
    if (isDataReady) {
      debugLog('Data Update', 'Fetching data due to date change or data update');
      fetchData();
    }
  }, [isDataReady, selectedDate, lastUpdateTimestamp, fetchData]);

  // Calculate remaining days and active workdays - run only when needed
  useEffect(() => {
    if (!needsRecalculation || !isDataReady) return;
    
    debugLog('Calculations', 'Starting remaining days calculation');
    
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
    
    debugLog('Calculations', 'Completed remaining days calculation', {
      remainingDays,
      remainingWorkdays,
      deficit
    });
    
    // Reset flag to prevent recalculation on every render
    setNeedsRecalculation(false);
  }, [
    needsRecalculation, 
    isDataReady, 
    activeDays, 
    dailyGoal, 
    originalDailyGoal, 
    monthlyGoal, 
    dailyData, 
    monthlyData
  ]);

  // Keep track of the last adjusted goal to prevent oscillations
  const lastAdjustedGoal = useRef(0);
  
  // Dynamically adjust daily goal based on progress - with multiple guards against loops
  useEffect(() => {
    // Skip adjustment if already in progress or if no recalculation needed
    if (adjustmentInProgress.current || !needsRecalculation) return;
    
    debugLog('Goal Adjustment', 'Starting daily goal adjustment', {
      remainingActiveWorkdays,
      monthlyDeficit,
      originalDailyGoal,
      lastAdjustedGoal: lastAdjustedGoal.current
    });
    
    adjustmentInProgress.current = true;
    
    try {
      if (remainingActiveWorkdays > 0 && monthlyDeficit !== 0 && originalDailyGoal > 0) {
        // Calculate new daily goal based on remaining deficit distributed across remaining active days
        const adjustedDailyGoal = originalDailyGoal + (monthlyDeficit / remainingActiveWorkdays);
        const newDailyGoal = Math.max(0, adjustedDailyGoal);
        
        // Multiple guards to prevent oscillation:
        // 1. Only update if there's a significant change (larger threshold)
        // 2. Don't update if we've already made a similar adjustment recently
        // 3. Add a percentage threshold to prevent tiny adjustments
        const absoluteChange = Math.abs(dailyGoal - newDailyGoal);
        const percentChange = absoluteChange / (dailyGoal || 1) * 100;
        const recentlyAdjusted = Math.abs(lastAdjustedGoal.current - newDailyGoal) < 1;
        
        if (absoluteChange > 5 && percentChange > 2 && !recentlyAdjusted) {
          // Round to the nearest whole number to prevent tiny fluctuations
          const roundedGoal = Math.round(newDailyGoal);
          setDailyGoal(roundedGoal);
          lastAdjustedGoal.current = roundedGoal;
          
          debugLog('Goal Adjustment', 'Adjusted daily goal', {
            originalGoal: originalDailyGoal,
            adjustedGoal: roundedGoal,
            absoluteChange,
            percentChange
          });
        } else {
          debugLog('Goal Adjustment', 'Skipped adjustment - change too small or recent adjustment', {
            proposedGoal: newDailyGoal,
            currentGoal: dailyGoal,
            absoluteChange,
            percentChange,
            recentlyAdjusted
          });
        }
      } else if (remainingActiveWorkdays === 0 && monthlyData.progress < monthlyGoal) {
        const remainingForMonth = Math.max(0, monthlyGoal - (monthlyData.progress || 0));
        
        // Only update if there's a significant change (larger threshold)
        if (Math.abs(dailyGoal - remainingForMonth) > 5) {
          const roundedGoal = Math.round(remainingForMonth);
          setDailyGoal(roundedGoal);
          lastAdjustedGoal.current = roundedGoal;
          
          debugLog('Goal Adjustment', 'Set final day goal', {
            remainingForMonth: roundedGoal
          });
        }
      }
    } finally {
      // Mark adjustment as complete
      adjustmentInProgress.current = false;
      
      // Important: after an adjustment, don't recalculate immediately
      // This prevents the adjustment/recalculation loop
      setNeedsRecalculation(false);
    }
  }, [
    needsRecalculation, 
    remainingActiveWorkdays, 
    monthlyDeficit, 
    originalDailyGoal, 
    dailyGoal, 
    monthlyData, 
    monthlyGoal
  ]);

  // Handle adding income - thoroughly memoized to ensure stability
  const handleAddIncome = useCallback(async (amount: number, source: IncomeSource, date?: Date) => {
    const targetDate = date || new Date();
    debugLog('Income Addition', 'Adding new income', { amount, source, targetDate });
    
    try {
      // First, add the income source to the global list if it doesn't exist
      const sourceExists = Array.isArray(incomeSources) && 
                          incomeSources.some(s => s.id === source.id);
      
      if (!sourceExists) {
        debugLog('Income Source', 'Adding new income source to global list', source);
        await addIncomeSource(source);
      }
      
      // Then add the income to the specific day
      await addIncomeToDay(targetDate, amount, source);
      debugLog('Income Addition', 'Income added successfully');
      
      // Only call one refresh function, not both
      await refreshAllData();
      
      return true;
    } catch (error) {
      console.error('Error adding income:', error);
      debugLog('Error', 'Failed to add income', error);
      throw error;
    }
  }, [incomeSources, addIncomeSource, addIncomeToDay, refreshAllData]);

  // Handle goal settings update
  const handleUpdateGoalSettings = useCallback(async (settings: {
    monthlyGoal: number;
    dailyGoal: number;
    activeDays: boolean[];
  }) => {
    debugLog('Goal Update', 'Updating goal settings', settings);
    
    try {
      await updateGoals(settings);
      debugLog('Goal Update', 'Goals updated in storage');
      
      // Update local state
      setMonthlyGoal(settings.monthlyGoal || 0);
      setDailyGoal(settings.dailyGoal || 0);
      setOriginalDailyGoal(settings.dailyGoal || 0);
      setActiveDays(settings.activeDays || [false, true, true, true, true, true, false]);
      
      // Only call one refresh function, not both
      await refreshAllData();
      
      return settings;
    } catch (error) {
      console.error('Failed to update goal settings:', error);
      debugLog('Error', 'Failed to update goal settings', error);
      throw error;
    }
  }, [updateGoals, refreshAllData]);

  // Calculate deficit/surplus info for display - memoized to prevent recalculation
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

  // Memoize the return value to prevent unnecessary rerenders
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