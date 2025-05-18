import React from 'react';
import Link from 'next/link';
import styles from './styles.module.css';

interface NavbarProps {
  onReset: () => void;
  hasGameStarted: boolean;
  onLeaderboardClick: () => void; // Add this prop
}

const Navbar: React.FC<NavbarProps> = ({
  onReset,
  hasGameStarted,
  onLeaderboardClick // Add this prop
}) => {
  return (
    <div className={styles.navbar}>
      <div className={styles.leftSection}>
        <Link href="/" className={styles.homeButton} title="Home">
          🏠
        </Link>
        <div className={styles.title}>SurvivorPuzzle</div>
      </div>
      <div className={styles.controls}>
        {/* Add leaderboard button */}
        <button 
          className={styles.leaderboardButton}
          onClick={onLeaderboardClick}
          title="View Leaderboard"
        >
          🏆
        </button>
        
        {hasGameStarted && (
          <button 
            className={styles.resetButton}
            onClick={onReset}
            title="Reset Game"
          >
            🔄
          </button>
        )}
      </div>
    </div>
  );
};

export default Navbar;