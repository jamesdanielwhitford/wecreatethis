// src/apps/fifteenpuzzle/components/Navbar/index.tsx

import React from 'react';
import { useRouter } from 'next/navigation';
import { NavbarProps } from '../../types/game.types';
import Timer from '../Timer';
import styles from './styles.module.css';

const Navbar: React.FC<NavbarProps> = ({
  gameMode,
  onModeChange,
  onRulesClick,
  elapsedTime,
  isRunning,
  isPaused,
  onTimerClick
}) => {
  const router = useRouter();

  // Handle mode changes with URL updates
  const handleModeChange = (mode: 'daily' | 'infinite') => {
    // Only proceed if it's a different mode
    if (mode === gameMode) return;
    
    // Call the original mode change handler
    onModeChange(mode);
    
    // Update the URL to match the selected mode
    router.push(`/15puzzle/${mode}`);
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.modeToggleContainer}>
        <div className={styles.modeToggle}>
          <button
            className={`${styles.modeButton} ${gameMode === 'daily' ? styles.active : ''}`}
            onClick={() => handleModeChange('daily')}
          >
            Daily
          </button>
          <button
            className={`${styles.modeButton} ${gameMode === 'infinite' ? styles.active : ''}`}
            onClick={() => handleModeChange('infinite')}
          >
            Infinite
          </button>
          {/* The active indicator is added via CSS ::after pseudo-element */}
        </div>
      </div>
      
      <div className={styles.timerContainer}>
        <Timer 
          elapsedTime={elapsedTime} 
          isRunning={isRunning} 
          isPaused={isPaused}
          onTimerClick={onTimerClick}
        />
      </div>
      
      <div className={styles.rulesContainer}>
        <button className={styles.rulesButton} onClick={onRulesClick}>
          Rules
        </button>
      </div>
    </nav>
  );
};

export default Navbar;