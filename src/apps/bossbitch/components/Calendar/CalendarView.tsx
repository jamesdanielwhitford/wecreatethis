// src/apps/bossbitch/components/Calendar/CalendarView.tsx
import React, { useState, useEffect } from 'react';
import WeekStrip from './components/WeekStrip';
import SelectedDateView from './components/SelectedDateView';
import CalendarHeader from './components/CalendarHeader';
import CalendarGrid from './CalendarGrid';
import LoadingIndicator from '../LoadingIndicator';
import AddGoalModal from '../AddGoalModal';
import EditDayModal from './components/EditDayModal/EditDayModal';
import { IncomeSource } from '../../types/goal.types';
import { dataService } from '../../services/data/dataService';
import { DailyEntry } from '../../services/data/types';
import useGoalData from '../../hooks/useGoalData';
import { getEntryKey } from '../../services/data/types';
import styles from './styles.module.css';

interface CalendarViewProps {
  type: 'daily' | 'monthly';
  onClose: () => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({
  type,
  onClose
}) => {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [calendarGoals, setCalendarGoals] = useState<DailyEntry[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [showCalendarGrid, setShowCalendarGrid] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const { 
    dailyGoal, 
    monthlyGoal, 
    dailyRingColor, 
    monthlyRingColor,
    dailyData,
    monthlyData,
    isLoading,
    addIncome,
    refreshData,
    setSelectedDate: hookSetSelectedDate 
  } = useGoalData({ initialDate: selectedDate });

  // Sync selected date with hook
  useEffect(() => {
    if (hookSetSelectedDate) {
      hookSetSelectedDate(selectedDate);
    }
  }, [selectedDate, hookSetSelectedDate]);

  // Generate week days for selected date
  useEffect(() => {
    if (selectedDate) {
      const date = new Date(selectedDate);
      const day = date.getDay();
      const diff = date.getDate() - day;
      
      const weekStart = new Date(date);
      weekStart.setDate(diff);
      
      const days = [];
      for (let i = 0; i < 7; i++) {
        const weekDay = new Date(weekStart);
        weekDay.setDate(weekStart.getDate() + i);
        days.push(weekDay);
      }
      
      setWeekDays(days);
      
      if (type === 'daily') {
        loadWeekData(days);
      }
    }
  }, [selectedDate, type]);

  // Load data for the week
  const loadWeekData = async (days: Date[]) => {
    if (days.length === 0 || type !== 'daily') return;
    
    setIsLoadingCalendar(true);
    try {
      const startDate = new Date(days[0]);
      const endDate = new Date(days[days.length - 1]);
      
      const entries = await dataService.getDailyEntries(startDate, endDate);
      
      const goals = entries.map(entry => ({
        date: new Date(entry.date),
        progress: entry.progress,
        maxValue: dailyGoal,
        segments: entry.segments
      }));
      
      if (dailyData && dailyData.progress > 0) {
        const dateStr = formatDateString(selectedDate);
        const hasSelectedDate = goals.some(g => formatDateString(g.date) === dateStr);
        
        if (!hasSelectedDate) {
          goals.push({
            date: new Date(selectedDate),
            progress: dailyData.progress,
            maxValue: dailyGoal,
            segments: dailyData.segments
          });
        }
      }
      
      setCalendarGoals(goals);
    } catch (error) {
      console.error('Error loading week data:', error);
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  // Load calendar data when month/year changes
  useEffect(() => {
    const loadCalendarData = async () => {
      if (!showCalendarGrid) return;
      
      setIsLoadingCalendar(true);
      try {
        if (type === 'daily') {
          const startDate = new Date(currentYear, currentMonth, 1);
          const endDate = new Date(currentYear, currentMonth + 1, 0);
          
          const entries = await dataService.getDailyEntries(startDate, endDate);
          
          const goals = entries.map(entry => ({
            date: new Date(entry.date),
            progress: entry.progress,
            maxValue: dailyGoal,
            segments: entry.segments
          }));
          
          setCalendarGoals(goals);
        } else {
          const startMonth = 0;
          const endMonth = 11;
          
          const entries = await dataService.getMonthlyEntries(
            currentYear, startMonth, currentYear, endMonth
          );
          
          const goals = entries.map(entry => ({
            date: new Date(entry.year, entry.month, 1),
            progress: entry.progress,
            maxValue: monthlyGoal,
            segments: entry.segments
          }));
          
          setCalendarGoals(goals);
        }
      } catch (error) {
        console.error('Error loading calendar data:', error);
      } finally {
        setIsLoadingCalendar(false);
      }
    };
    
    loadCalendarData();
  }, [currentYear, currentMonth, type, dailyGoal, monthlyGoal, showCalendarGrid]);

  // Format date string for consistent comparison
  const formatDateString = (d: Date) => {
    return getEntryKey(d);
  };

  // Get goal data for a specific date
  const getGoalData = (date: Date) => {
    if (!date) return null;
    
    const dateString = formatDateString(date);
    const isSelectedDate = dateString === formatDateString(selectedDate);

    // Return current daily data for selected date
    if (isSelectedDate && type === 'daily') {
      return {
        date: selectedDate,
        progress: dailyData.progress || 0,
        maxValue: dailyGoal,
        segments: dailyData.segments
      };
    }
    
    // Look for data in calendar goals
    const goalData = calendarGoals.find(goal => {
      if (!goal || !goal.date) return false;
      return formatDateString(goal.date) === dateString;
    });

    return goalData || {
      date: date,
      progress: 0,
      maxValue: dailyGoal,
      segments: []
    };
  };

  // Navigation handlers
  const goToPrevious = () => {
    if (showCalendarGrid) {
      if (type === 'monthly') {
        setCurrentYear(prev => prev - 1);
      } else {
        if (currentMonth === 0) {
          setCurrentMonth(11);
          setCurrentYear(prev => prev - 1);
        } else {
          setCurrentMonth(prev => prev - 1);
        }
      }
    } else {
      const newDate = new Date(selectedDate);
      if (type === 'daily') {
        newDate.setDate(newDate.getDate() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() - 1);
      }
      setSelectedDate(newDate);
    }
  };

  const goToNext = () => {
    if (showCalendarGrid) {
      if (type === 'monthly') {
        setCurrentYear(prev => prev + 1);
      } else {
        if (currentMonth === 11) {
          setCurrentMonth(0);
          setCurrentYear(prev => prev + 1);
        } else {
          setCurrentMonth(prev => prev + 1);
        }
      }
    } else {
      const newDate = new Date(selectedDate);
      if (type === 'daily') {
        newDate.setDate(newDate.getDate() + 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      setSelectedDate(newDate);
    }
  };

  // Get header text based on view type and mode
  const getHeaderText = () => {
    if (showCalendarGrid) {
      if (type === 'monthly') {
        return currentYear.toString();
      }
      return new Intl.DateTimeFormat('en-US', { 
        month: 'long',
        year: 'numeric'
      }).format(new Date(currentYear, currentMonth));
    } else {
      if (type === 'monthly') {
        return new Intl.DateTimeFormat('en-US', { 
          month: 'long',
          year: 'numeric' 
        }).format(selectedDate);
      }
      return new Intl.DateTimeFormat('en-US', { 
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }).format(selectedDate);
    }
  };

  // Handle adding income for the selected date
  const handleAddIncome = async (amount: number, source: IncomeSource) => {
    try {
      await addIncome(amount, source);
      setShowAddModal(false);
      
      if (weekDays.length > 0) {
        await loadWeekData(weekDays);
      }
    } catch (error) {
      console.error('Error adding income:', error);
    }
  };

  // Handle editing income sources for the selected day
  const handleEditIncome = async () => {
    setShowEditModal(false);
    
    if (refreshData) {
      await refreshData();
    }
    
    if (weekDays.length > 0) {
      await loadWeekData(weekDays);
    }
    
    if (showCalendarGrid) {
      const startDate = new Date(currentYear, currentMonth, 1);
      const endDate = new Date(currentYear, currentMonth + 1, 0);
      
      const entries = await dataService.getDailyEntries(startDate, endDate);
      
      const goals = entries.map(entry => ({
        date: new Date(entry.date),
        progress: entry.progress,
        maxValue: dailyGoal,
        segments: entry.segments
      }));
      
      setCalendarGoals(goals);
    }
  };

  // Handle date selection in calendar grid
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setShowCalendarGrid(false);
  };

  const displayValue = type === 'daily' ? dailyData : monthlyData;
  const maxValue = type === 'daily' ? dailyGoal : monthlyGoal;
  const ringColor = type === 'daily' ? dailyRingColor : monthlyRingColor;

  return (
    <div className={styles.calendarView}>
      <div className={styles.container}>
        <CalendarHeader
          headerText={getHeaderText()}
          onClose={onClose}
          onPrevious={goToPrevious}
          onNext={goToNext}
          onToggleView={() => setShowCalendarGrid(!showCalendarGrid)}
        />

        {isLoadingCalendar ? (
          <div className={styles.loadingState}>
            <LoadingIndicator />
            <p>Loading calendar data...</p>
          </div>
        ) : (
          <>
            {showCalendarGrid ? (
              <CalendarGrid
                type={type}
                month={currentMonth}
                year={currentYear}
                goals={calendarGoals}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
              />
            ) : (
              <SelectedDateView
                type={type}
                displayValue={displayValue}
                maxValue={maxValue}
                ringColor={ringColor}
                onAddClick={() => setShowAddModal(true)}
                onEditClick={() => setShowEditModal(true)}
              >
                {type === 'daily' && (
                  <WeekStrip
                    weekDays={weekDays}
                    selectedDate={selectedDate}
                    dailyRingColor={dailyRingColor}
                    getGoalData={getGoalData}
                    onDateSelect={setSelectedDate}
                  />
                )}
              </SelectedDateView>
            )}
          </>
        )}

        {showAddModal && (
          <AddGoalModal
            onClose={() => setShowAddModal(false)}
            onAdd={handleAddIncome}
            currentValue={dailyData.progress}
            maxValue={dailyGoal}
            existingSources={dailyData.segments}
            selectedDate={selectedDate}
          />
        )}

        {showEditModal && (
          <EditDayModal
            onClose={() => setShowEditModal(false)}
            onSave={handleEditIncome}
            selectedDate={selectedDate}
            incomeSources={displayValue.segments || []}
          />
        )}
      </div>
    </div>
  );
};

export default CalendarView;