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
    monthlyGoal,
    activeDays,
    dailyRingColor,
    monthlyRingColor,
    addIncome,
    updateGoalSettings,
    isLoading
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
    updateGoalSettings(settings);
    setShowEditModal(false);
  };

  // Handle adding new income
  const handleAddIncome = async (amount: number, source: { id: string; name: string; color: string }) => {
    const newDailyValue = dailyData.progress + amount;
    const newMonthlyValue = monthlyData.progress + amount;

    // Add income
    await addIncome(amount, source);

    // Show celebration if goal is met
    if (
      (dailyData.progress < dailyGoal && newDailyValue >= dailyGoal) ||
      (monthlyData.progress < monthlyGoal && newMonthlyValue >= monthlyGoal)
    ) {
      setShowCelebration(true);
    }

    setShowAddModal(false);
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
              <div className={styles.goalSection}>
                <h2 className={styles.goalCardTitle}>Daily Goal</h2>
                <button 
                  className={styles.goalCard} 
                  onClick={() => setActiveView('daily')}
                >
                  <div className={styles.ringContainer}>
                    <ProgressRing
                      progress={dailyData.progress}
                      maxValue={dailyGoal}
                      color={dailyRingColor}
                      size={240}
                      strokeWidth={24}
                      segments={dailyData.segments}
                    />
                  </div>
                  <div className={styles.goalValue}>
                    {formatZAR(dailyData.progress)} / {formatZAR(dailyGoal)}
                  </div>
                </button>
              </div>

              {/* Monthly Goal Section */}
              <div className={styles.goalSection}>
                <h2 className={styles.goalCardTitle}>Monthly Goal</h2>
                <button 
                  className={styles.goalCard}
                  onClick={() => setActiveView('monthly')}
                >
                  <div className={styles.ringContainer}>
                    <ProgressRing
                      progress={monthlyData.progress}
                      maxValue={monthlyGoal}
                      color={monthlyRingColor}
                      size={240}
                      strokeWidth={24}
                      segments={monthlyData.segments}
                    />
                  </div>
                  <div className={styles.goalValue}>
                    {formatZAR(monthlyData.progress)} / {formatZAR(monthlyGoal)}
                  </div>
                </button>
              </div>

              {/* Action Buttons */}
              <div className={styles.actionsContainer}>
                <button 
                  onClick={() => setShowAddModal(true)}
                  className={styles.addButton}
                >
                  Add to Goal
                </button>
                <button 
                  onClick={() => setShowEditModal(true)}
                  className={styles.editButton}
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
            currentDailyGoal={dailyGoal}
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