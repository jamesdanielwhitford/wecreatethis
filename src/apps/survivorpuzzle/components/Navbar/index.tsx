import React from 'react';
import { Difficulty } from '../../types/game.types';
import styles from './styles.module.css';

interface NavbarProps {
  difficulty: Difficulty;
  onDifficultyClick: () => void;
  onReset: () => void;
  hasGameStarted: boolean;
}

const Navbar: React.FC<NavbarProps> = ({
  difficulty,
  onDifficultyClick,
  onReset,
  hasGameStarted
}) => {
  return (
    <div className={styles.navbar}>
      <div className={styles.title}>SurvivorPuzzle</div>
      <div className={styles.controls}>
        <button 
          className={styles.difficultyButton}
          onClick={onDifficultyClick}
        >
          Difficulty: {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
        </button>
        {hasGameStarted && (
          <button 
            className={styles.resetButton}
            onClick={onReset}
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
};

export default Navbar;