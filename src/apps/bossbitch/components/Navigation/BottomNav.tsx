'use client';

// src/apps/bossbitch/components/Navigation/BottomNav.tsx
import React from 'react';
import { Target, Settings } from 'lucide-react';
import styles from './styles.module.css';

export type NavTab = 'goals' | 'settings';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className={styles.navContainer}>
      {/* Goals Tab */}
      <button
        onClick={() => onTabChange('goals')}
        className={`${styles.navButton} ${activeTab === 'goals' ? styles.active : styles.inactive}`}
        aria-label="Goals"
      >
        <Target className={styles.navIcon} strokeWidth={activeTab === 'goals' ? 2.5 : 1.5} />
        <span className={styles.navLabel}>Goals</span>
        {activeTab === 'goals' && (
          <span className={styles.activeIndicator} />
        )}
      </button>

      {/* Settings Tab */}
      <button
        onClick={() => onTabChange('settings')}
        className={`${styles.navButton} ${activeTab === 'settings' ? styles.active : styles.inactive}`}
        aria-label="Settings"
      >
        <Settings className={styles.navIcon} strokeWidth={activeTab === 'settings' ? 2.5 : 1.5} />
        <span className={styles.navLabel}>Settings</span>
        {activeTab === 'settings' && (
          <span className={styles.activeIndicator} />
        )}
      </button>
    </nav>
  );
};

export default BottomNav;