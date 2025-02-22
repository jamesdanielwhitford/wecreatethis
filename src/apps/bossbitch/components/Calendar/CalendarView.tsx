'use client';

// src/apps/bossbitch/components/Calendar/CalendarView.tsx
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Plus, Edit } from 'lucide-react';
import CalendarGrid from './CalendarGrid';
import ProgressRing from '../ProgressRing';
import { IncomeSource } from '../../types/goal.types';
import { formatZAR } from '../../utils/currency';
import useGoalData from '../../hooks/useGoalData';
import { dataService } from '../../services/data/dataService';
import LoadingIndicator from '../LoadingIndicator';
import AddGoalModal from '../../components/AddGoalModal';
import EditDayModal from '../EditDayModal/EditDayModal';
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
  const [calendarGoals, setCalendarGoals] = useState<any[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [showCalendarGrid, setShowCalendarGrid] = useState(false);
  
  // Add modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Get goal data from hook
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

  // When selected date changes in the component, update the hook
  useEffect(() => {
    if (hookSetSelectedDate) {
      hookSetSelectedDate(selectedDate);
    }
  }, [selectedDate, hookSetSelectedDate]);

  // Generate week days for the selected date
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
      
      // Load data for the current week when in daily view
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
      // Get start and end date of week
      const startDate = new Date(days[0]);
      const endDate = new Date(days[days.length - 1]);
      
      // Get all daily entries for the week
      const entries = await dataService.getDailyEntries(startDate, endDate);
      
      // Map to the format CalendarGrid expects
      const goals = entries.map(entry => ({
        date: new Date(entry.date),
        progress: entry.progress,
        maxValue: dailyGoal,
        segments: entry.segments
      }));
      
      // Include current selected date data if available
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
      if (!showCalendarGrid) return; // Only load data when calendar grid is shown
      
      setIsLoadingCalendar(true);
      try {
        if (type === 'daily') {
          // Create start and end dates for the current month view
          const startDate = new Date(currentYear, currentMonth, 1);
          const endDate = new Date(currentYear, currentMonth + 1, 0);
          
          // Get all daily entries for the month
          const entries = await dataService.getDailyEntries(startDate, endDate);
          
          // Map to the format CalendarGrid expects
          const goals = entries.map(entry => ({
            date: new Date(entry.date),
            progress: entry.progress,
            maxValue: dailyGoal,
            segments: entry.segments
          }));
          
          setCalendarGoals(goals);
        } else {
          // For monthly view, get data for the entire year
          const startMonth = 0; // January
          const endMonth = 11; // December
          
          // Get all monthly entries for the year
          const entries = await dataService.getMonthlyEntries(
            currentYear, startMonth, currentYear, endMonth
          );
          
          // Map to the format CalendarGrid expects
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

  // Format date to YYYY-MM-DD for consistent comparison
  const formatDateString = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Navigation handlers
  const goToPrevious = () => {
    if (showCalendarGrid) {
      // When in calendar grid mode, navigate months/years
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
      // When in day view mode, navigate days
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
      // When in calendar grid mode, navigate months/years
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
      // When in day view mode, navigate days
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

  // Get goal data for a specific date
  const getGoalData = (date: Date) => {
    if (!date) return null;
    
    const dateString = formatDateString(date);
    
    // Check the current displayed value when date matches the selected date
    if (dateString === formatDateString(selectedDate) && type === 'daily' && dailyData && dailyData.progress > 0) {
      return {
        date: selectedDate,
        progress: dailyData.progress,
        maxValue: dailyGoal,
        segments: dailyData.segments
      };
    }
    
    // Try to find in calendar goals
    return calendarGoals.find(goal => {
      if (!goal || !goal.date) return false;
      return formatDateString(goal.date) === dateString;
    });
  };

  // Toggle between date view and calendar grid
  const toggleCalendarGrid = () => {
    setShowCalendarGrid(prev => !prev);
  };

  // Calculate the percentage for progress bar
  const calculatePercentage = () => {
    if (type === 'daily') {
      return Math.min((dailyData.progress / dailyGoal) * 100, 100);
    } else {
      return Math.min((monthlyData.progress / monthlyGoal) * 100, 100);
    }
  };

  // Add income for the selected date
  const handleAddIncome = async (amount: number, source: IncomeSource) => {
    try {
      await addIncome(amount, source);
      setShowAddModal(false);
      
      // Refresh week data to show the newly added income
      if (weekDays.length > 0) {
        loadWeekData(weekDays);
      }
    } catch (error) {
      console.error('Error adding income:', error);
    }
  };

  // Handle editing income sources for the selected day
  const handleEditIncome = async () => {
    setShowEditModal(false);
    
    // First, refresh the selected date data in the hook
    if (refreshData) {
      await refreshData();
    }
    
    // Refresh week data to show the edited income
    if (weekDays.length > 0) {
      await loadWeekData(weekDays);
    }
    
    // If we're showing the calendar grid, refresh that too
    if (showCalendarGrid) {
      // Create start and end dates for the current month view
      const startDate = new Date(currentYear, currentMonth, 1);
      const endDate = new Date(currentYear, currentMonth + 1, 0);
      
      // Get all daily entries for the month
      const entries = await dataService.getDailyEntries(startDate, endDate);
      
      // Map to the format CalendarGrid expects
      const goals = entries.map(entry => ({
        date: new Date(entry.date),
        progress: entry.progress,
        maxValue: dailyGoal,
        segments: entry.segments
      }));
      
      setCalendarGoals(goals);
    }
  };

  const displayValue = type === 'daily' ? dailyData : monthlyData;
  const maxValue = type === 'daily' ? dailyGoal : monthlyGoal;
  const ringColor = type === 'daily' ? dailyRingColor : monthlyRingColor;

  return (
    <div className={styles.calendarView}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <button
            onClick={onClose}
            className={styles.iconButton}
            aria-label="Close"
          >
            <X size={24} />
          </button>
          
          <div className={styles.navigationContainer}>
            <button
              onClick={goToPrevious}
              className={styles.iconButton}
              aria-label="Previous"
            >
              <ChevronLeft size={24} />
            </button>
            
            <h2 className={styles.headerTitle}>
              {getHeaderText()}
            </h2>
            
            <button
              onClick={goToNext}
              className={styles.iconButton}
              aria-label="Next"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          <button
            onClick={toggleCalendarGrid}
            className={styles.iconButton}
            aria-label={showCalendarGrid ? "Show Day View" : "Show Calendar"}
          >
            <CalendarIcon size={24} />
          </button>
        </div>

        {/* Loading Indicator */}
        {isLoadingCalendar ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>Loading calendar data...</p>
          </div>
        ) : (
          <>
            {/* Calendar Grid (shown only when toggled on) */}
            {showCalendarGrid ? (
              <CalendarGrid
                type={type}
                month={currentMonth}
                year={currentYear}
                goals={calendarGoals}
                selectedDate={selectedDate}
                onDateSelect={(date) => {
                  setSelectedDate(date);
                  setShowCalendarGrid(false);
                }}
              />
            ) : (
              /* Day View (default view) */
              <>
                {type === 'daily' && (
                  <div className={styles.selectedDateView}>
                    {/* Week Strip */}
                    <div className={styles.weekStrip}>
                      {weekDays.map((day, index) => {
                        const dayGoal = getGoalData(day);
                        const isActive = day.toDateString() === selectedDate.toDateString();
                        const isCurrentDay = day.toDateString() === today.toDateString();
                        
                        return (
                          <div 
                            key={index} 
                            className={`${styles.weekDay} ${isActive ? styles.activeWeekDay : ''}`}
                            onClick={() => setSelectedDate(day)}
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
                                maxValue={dayGoal?.maxValue || 1}
                                color={isCurrentDay ? dailyRingColor : '#888888'}
                                size={30}
                                strokeWidth={3}
                                segments={dayGoal?.segments}
                                animate={false}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Selected Date Ring */}
                    <div className={styles.selectedRingContainer}>
                      <ProgressRing
                        progress={displayValue.progress}
                        maxValue={maxValue}
                        color={ringColor}
                        size={240}
                        strokeWidth={24}
                        segments={displayValue.segments}
                        animate={true}
                      />
                      <div className={styles.ringCenterValue}>
                        {formatZAR(displayValue.progress)}
                      </div>
                    </div>
                    
                    {/* Details Section */}
                    <div className={styles.detailsContainer}>
                      <div className={styles.detailsHeader}>
                        <h4 className={styles.detailsTitle}>
                          Daily Goal
                        </h4>
                        <span className={styles.detailsValue}>
                          {formatZAR(maxValue)}
                        </span>
                      </div>
                      
                      <div className={styles.progressBar}>
                        <div 
                          className={styles.progressFill}
                          style={{ width: `${calculatePercentage()}%` }}
                        />
                      </div>
                      
                      {displayValue.segments && displayValue.segments.length > 0 && (
                        <>
                          <h5 className={styles.sourcesTitle}>Income Sources:</h5>
                          <div className={styles.sourcesList}>
                            {displayValue.segments.map((segment: IncomeSource) => (
                              <div 
                                key={segment.id}
                                className={styles.sourceItem}
                              >
                                <div className={styles.sourceInfo}>
                                  <div 
                                    className={styles.sourceColor}
                                    style={{ backgroundColor: segment.color }}
                                  />
                                  <span className={styles.sourceName}>{segment.name}</span>
                                </div>
                                <span className={styles.sourceValue}>
                                  {formatZAR(segment.value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                      
                      {/* Action Buttons */}
                      <div className={styles.dayActionButtons}>
                        <button 
                          className={styles.dayActionButton}
                          onClick={() => setShowAddModal(true)}
                        >
                          <Plus size={18} />
                          <span>Add Income</span>
                        </button>
                        
                        <button 
                          className={styles.dayActionButton}
                          onClick={() => setShowEditModal(true)}
                          disabled={!displayValue.segments || displayValue.segments.length === 0}
                        >
                          <Edit size={18} />
                          <span>Edit Income</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Monthly View */}
                {type === 'monthly' && (
                  <div className={styles.selectedDateView}>
                    {/* Month Ring */}
                    <div className={styles.selectedRingContainer}>
                      <ProgressRing
                        progress={displayValue.progress}
                        maxValue={maxValue}
                        color={ringColor}
                        size={240}
                        strokeWidth={24}
                        segments={displayValue.segments}
                        animate={true}
                      />
                      <div className={styles.ringCenterValue}>
                        {formatZAR(displayValue.progress)}
                      </div>
                    </div>
                    
                    {/* Details Section */}
                    <div className={styles.detailsContainer}>
                      <div className={styles.detailsHeader}>
                        <h4 className={styles.detailsTitle}>
                          Monthly Goal
                        </h4>
                        <span className={styles.detailsValue}>
                          {formatZAR(maxValue)}
                        </span>
                      </div>
                      
                      <div className={styles.progressBar}>
                        <div 
                          className={styles.progressFill}
                          style={{ width: `${calculatePercentage()}%` }}
                        />
                      </div>
                      
                      {displayValue.segments && displayValue.segments.length > 0 && (
                        <>
                          <h5 className={styles.sourcesTitle}>Income Sources:</h5>
                          <div className={styles.sourcesList}>
                            {displayValue.segments.map((segment: IncomeSource) => (
                              <div 
                                key={segment.id}
                                className={styles.sourceItem}
                              >
                                <div className={styles.sourceInfo}>
                                  <div 
                                    className={styles.sourceColor}
                                    style={{ backgroundColor: segment.color }}
                                  />
                                  <span className={styles.sourceName}>{segment.name}</span>
                                </div>
                                <span className={styles.sourceValue}>
                                  {formatZAR(segment.value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Empty State */}
                {selectedDate && !displayValue.progress && (
                  <div className={styles.emptyState}>
                    <ProgressRing
                      progress={0}
                      maxValue={100}
                      color="#888888"
                      size={80}
                      strokeWidth={8}
                      animate={false}
                    />
                    <p className={styles.emptyMessage}>
                      No data for this {type === 'daily' ? 'day' : 'month'}.
                    </p>
                    
                    {/* Add button for empty state in daily view */}
                    {type === 'daily' && (
                      <button 
                        className={styles.emptyStateButton}
                        onClick={() => setShowAddModal(true)}
                      >
                        <Plus size={18} />
                        <span>Add Income for this Day</span>
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
      
      {/* Add Income Modal */}
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
      
      {/* Edit Day Income Modal */}
      {showEditModal && (
        <EditDayModal
          onClose={() => setShowEditModal(false)}
          onSave={handleEditIncome}
          selectedDate={selectedDate}
          incomeSources={displayValue.segments || []}
        />
      )}
    </div>
  );
};

export default CalendarView;