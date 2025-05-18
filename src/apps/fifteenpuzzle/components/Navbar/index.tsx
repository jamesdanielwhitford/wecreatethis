import React from 'react';
import { useRouter } from 'next/navigation';
import { GameMode } from '../../types/game.types';
import styles from './styles.module.css';

interface NavbarProps {
  gameMode: GameMode;
  onModeChange: (mode: GameMode) => void;
  onRulesClick: () => void;
  onLeaderboardClick: () => void; // Add this prop
}

const Navbar: React.FC<NavbarProps> = ({
  gameMode,
  onModeChange,
  onRulesClick,
  onLeaderboardClick // Add this prop
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

  // Handle home click
  const handleHomeClick = () => {
    router.push('/');
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
        <span className={styles.logoText}>15 Puzzle</span>
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
        </div>
        {/* Add Leaderboard button */}
        <button 
          className={styles.iconButton} 
          onClick={onLeaderboardClick}
          title="Leaderboard"
        >
          <span className={styles.iconTrophy}>🏆</span>
        </button>
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