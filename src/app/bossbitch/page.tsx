'use client';

// src/app/bossbitch/page.tsx
import React, { useState, useEffect } from 'react';
import { CalendarView } from '@/apps/bossbitch/components/Calendar';
import { formatZAR } from '@/apps/bossbitch/utils/currency';
import ProgressRing from '@/apps/bossbitch/components/ProgressRing';
import AddGoalModal from '@/apps/bossbitch/components/AddGoalModal';
import EditGoalsModal from '@/apps/bossbitch/components/EditGoalsModal';
import CelebrationModal from '@/apps/bossbitch/components/CelebrationModal';
import LoadingIndicator from '@/apps/bossbitch/components/LoadingIndicator';
import BottomNav from '@/apps/bossbitch/components/Navigation/BottomNav';
import SettingsPage from '@/apps/bossbitch/components/Settings/SettingsPage';
import { DataProvider } from '@/apps/bossbitch/contexts/DataContext';
import useGoalData from '@/apps/bossbitch/hooks/useGoalData';
import { IncomeSource } from '@/apps/bossbitch/types/goal.types';
import styles from './page.module.css';

type ThemeOption = 'light' | 'dark' | 'system';

function BossBitchContent() {
  // View and modal states
  const [activeTab, setActiveTab] = useState<'goals' | 'settings'>('goals');
  const [activeView, setActiveView] = useState<'daily' | 'monthly' | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean | null>(null);
  const [themePreference, setThemePreference] = useState<ThemeOption>('system');

  // Get data from the hook
  const {
    dailyData,
    monthlyData,
    dailyGoal,
    originalDailyGoal,
    monthlyGoal,
    activeDays,
    dailyRingColor,
    monthlyRingColor,
    addIncome,
    updateGoalSettings,
    isLoading,
    isDataReady,
    remainingDaysInMonth,
    remainingActiveWorkdays,
    deficitInfo,
    refreshData
  } = useGoalData();

  // Initialize theme based on saved preference and device setting
  useEffect(() => {
    // First check if there's a saved preference
    const savedTheme = localStorage.getItem('bossbitch-theme-preference');
    
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setThemePreference(savedTheme as ThemeOption);
      
      if (savedTheme === 'system') {
        // Use system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setIsDarkMode(prefersDark);
      } else {
        // Use saved preference
        setIsDarkMode(savedTheme === 'dark');
      }
    } else {
      // Default to system preference if no saved preference
      setThemePreference('system');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDark);
    }
  }, []);

  // Listen for device theme changes if using system preference
  useEffect(() => {
    if (themePreference !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };
    
    // Modern browsers
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [themePreference]);

  // Apply theme when it changes
  useEffect(() => {
    if (isDarkMode === null) return;
    
    document.documentElement.classList.toggle('dark-mode', isDarkMode);
    document.documentElement.classList.toggle('light-mode', !isDarkMode);
  }, [isDarkMode]);

  // Handle theme change
  const handleThemeChange = (theme: ThemeOption) => {
    setThemePreference(theme);
    localStorage.setItem('bossbitch-theme-preference', theme);
    
    if (theme === 'system') {
      // Let system preference decide
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDark);
    } else {
      // Manually set theme
      setIsDarkMode(theme === 'dark');
    }
  };

  // Handle goal settings update
  const handleGoalUpdate = (settings: {
    monthlyGoal: number;
    dailyGoal: number;
    activeDays: boolean[];
  }) => {
    updateGoalSettings(settings)
      .then(() => {
        setShowEditModal(false);
        // Manual refresh to ensure UI updates
        refreshData();
      })
      .catch((error) => {
        console.error('Failed to update goals:', error);
      });
  };

  // Handle adding new income
  const handleAddIncome = async (amount: number, source: { id: string; name: string; color: string }) => {
    try {
      // Add income
      await addIncome(amount, source);
      
      // Calculate new values to determine if celebration should show
      const newDailyValue = dailyData.progress + amount;
      const newMonthlyValue = monthlyData.progress + amount;

      // Show celebration if goal is met
      if (
        (dailyData.progress < dailyGoal && newDailyValue >= dailyGoal) ||
        (monthlyData.progress < monthlyGoal && newMonthlyValue >= monthlyGoal)
      ) {
        setShowCelebration(true);
      }

      setShowAddModal(false);
      
      // Manual refresh to ensure UI updates
      refreshData();
    } catch (error) {
      console.error('Failed to add income:', error);
    }
  };

  // Conditionally render skeleton loading state or actual content
  const renderGoalCard = (
    title: string, 
    data: { progress: number; segments: IncomeSource[] }, 
    goal: number, 
    color: string, 
    onClick: () => void,
    isDaily: boolean = false
  ) => {
    // Safety checks for NaN values
    const safeProgress = isNaN(data.progress) ? 0 : data.progress;
    const safeGoal = isNaN(goal) ? 100 : goal;
    
    return (
      <div className={styles.goalSection}>
        <h2 className={styles.goalCardTitle}>{title}</h2>
        <button 
          className={styles.goalCard} 
          onClick={onClick}
        >
          <div className={styles.ringContainer}>
            <ProgressRing
              progress={safeProgress}
              maxValue={safeGoal}
              color={color}
              size={240}
              strokeWidth={24}
              segments={data.segments || []}
              animate={isDataReady && !isLoading}
            />
          </div>
          <div className={styles.goalValue}>
            {formatZAR(safeProgress)} / {formatZAR(safeGoal)}
          </div>
          
          {/* Show adaptive goal info for daily goal */}
          {isDaily && originalDailyGoal !== dailyGoal && (
            <div className={`${styles.goalAdjustment} ${deficitInfo.isDeficit ? styles.deficit : styles.surplus}`}>
              {originalDailyGoal < dailyGoal ? (
                <span>⬆️ Adjusted from {formatZAR(originalDailyGoal)}</span>
              ) : (
                <span>⬇️ Adjusted from {formatZAR(originalDailyGoal)}</span>
              )}
            </div>
          )}
        </button>
      </div>
    );
  };

  // Render dynamic goal status information
  const renderGoalStatusInfo = () => {
    if (!isDataReady || remainingActiveWorkdays === 0) return null;
    
    return (
      <div className={`${styles.goalStatusCard} ${deficitInfo.isDeficit ? styles.deficitCard : styles.surplusCard}`}>
        <h3 className={styles.goalStatusTitle}>
          {deficitInfo.isDeficit ? 'Catching Up' : 'You\'re Ahead!'}
        </h3>
        <p className={styles.goalStatusMessage}>{deficitInfo.message}</p>
        <div className={styles.goalStatusDetails}>
          <div className={styles.goalStatusItem}>
            <span className={styles.goalStatusLabel}>Remaining active days:</span>
            <span className={styles.goalStatusValue}>{remainingActiveWorkdays}</span>
          </div>
          <div className={styles.goalStatusItem}>
            <span className={styles.goalStatusLabel}>
              {deficitInfo.isDeficit ? 'Extra needed per day:' : 'Less needed per day:'}
            </span>
            <span className={styles.goalStatusValue}>{formatZAR(deficitInfo.perDay)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <main className={styles.mainContent}>
        {activeTab === 'goals' ? (
          <>
            <header className={styles.header}>
              <h1 className={styles.title}>Boss Bitch</h1>
              <p className={styles.dateDisplay}>
                {new Intl.DateTimeFormat('en-US', { 
                  weekday: 'long',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                }).format(new Date())}
              </p>
            </header>

            <div className={styles.goalCardContainer}>
              {/* Daily Goal Section */}
              {renderGoalCard(
                "Daily Goal", 
                dailyData, 
                dailyGoal, 
                dailyRingColor, 
                () => setActiveView('daily'),
                true
              )}

              {/* Goal Status Info Section */}
              {renderGoalStatusInfo()}

              {/* Monthly Goal Section */}
              {renderGoalCard(
                "Monthly Goal", 
                monthlyData, 
                monthlyGoal, 
                monthlyRingColor, 
                () => setActiveView('monthly')
              )}

              {/* Action Buttons */}
              <div className={styles.actionsContainer}>
                <button 
                  onClick={() => setShowAddModal(true)}
                  className={styles.addButton}
                  disabled={isLoading}
                >
                  Add to Goal
                </button>
                <button 
                  onClick={() => setShowEditModal(true)}
                  className={styles.editButton}
                  disabled={isLoading}
                >
                  Edit Goals
                </button>
              </div>
            </div>
          </>
        ) : (
          <SettingsPage
            isDarkMode={isDarkMode ?? true}
            onThemeToggle={() => handleThemeChange(isDarkMode ? 'light' : 'dark')}
            themePreference={themePreference}
            onThemeChange={handleThemeChange}
          />
        )}

        {/* Loading Indicator */}
        {isLoading && <LoadingIndicator fullScreen />}

        {/* Modals */}
        {activeView && (
          <CalendarView
            type={activeView}
            onClose={() => setActiveView(null)}
          />
        )}

        {showAddModal && (
          <AddGoalModal
            onClose={() => setShowAddModal(false)}
            onAdd={handleAddIncome}
            currentValue={dailyData.progress}
            maxValue={dailyGoal}
            existingSources={dailyData.segments}
          />
        )}

        {showEditModal && (
          <EditGoalsModal
            onClose={() => setShowEditModal(false)}
            onSave={handleGoalUpdate}
            currentMonthlyGoal={monthlyGoal}
            currentDailyGoal={originalDailyGoal || dailyGoal}
            initialActiveDays={activeDays}
          />
        )}

        {showCelebration && (
          <CelebrationModal
            onClose={() => setShowCelebration(false)}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <div className={styles.bottomNav}>
        <div className={styles.bottomNavContent}>
          <BottomNav
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>
      </div>
    </div>
  );
}

export default function BossBitchPage() {
  return (
    <DataProvider>
      <BossBitchContent />
    </DataProvider>
  );
}