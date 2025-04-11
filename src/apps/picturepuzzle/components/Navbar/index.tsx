// src/apps/picturepuzzle/components/Navbar/index.tsx

import React from 'react';
import { useRouter } from 'next/navigation';
import { NavbarProps } from '../../types/games.types';
import styles from './styles.module.css';

const Navbar: React.FC<NavbarProps> = ({
  gameMode,
  onModeChange,
  onRulesClick
}) => {
  const router = useRouter();

  // Handle mode changes with URL updates
  const handleModeChange = (mode: 'daily' | 'infinite' | 'impossible') => {
    // Only proceed if it's a different mode
    if (mode === gameMode) return;
    
    // Call the original mode change handler
    onModeChange(mode);
    
    // Update the URL to match the selected mode
    router.push(`/picturepuzzle/${mode}`);
  };

  // Handle home click
  const handleHomeClick = () => {
    window.location.href = 'https://www.wecreatethis.com';
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.homeContainer}>
        <button 
          className={styles.homeButton} 
          onClick={handleHomeClick}
          title="Go to Home"
        >
          <span className={styles.iconHome}>🏠</span>
        </button>
      </div>
      
      <div className={styles.logo}>
        <span className={styles.logoText}>Picture Puzzle</span>
      </div>
      
      <div className={styles.navControls}>
        <div className={styles.modeToggle}>
          <button
            className={`${styles.modeButton} ${gameMode === 'daily' ? styles.active : ''}`}
            onClick={() => handleModeChange('daily')}
            title="Daily Mode"
          >
            <span className={styles.iconSun}>☀</span>
          </button>
          <button
            className={`${styles.modeButton} ${gameMode === 'infinite' ? styles.active : ''}`}
            onClick={() => handleModeChange('infinite')}
            title="Infinite Mode"
          >
            <span className={styles.iconInfinity}>∞</span>
          </button>
          <button
            className={`${styles.modeButton} ${gameMode === 'impossible' ? styles.active : ''}`}
            onClick={() => handleModeChange('impossible')}
            title="Impossible Mode"
          >
            <span className={styles.iconImpossible}>💀</span>
          </button>
        </div>
        <button 
          className={styles.iconButton} 
          onClick={onRulesClick}
          title="Rules"
        >
          <span className={styles.iconQuestion}>?</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;