// src/apps/survivorpuzzle/components/Navbar/index.tsx
import React from 'react';
import Link from 'next/link';
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
  // Map difficulties to emojis
  const difficultyEmojis = {
    'none': '⏱️',
    'easy': '😀',
    'medium': '😐',
    'difficult': '😰'
  };

  return (
    <div className={styles.navbar}>
      <div className={styles.leftSection}>
        <Link href="/" className={styles.homeButton} title="Home">
          🏠
        </Link>
        <div className={styles.title}>SurvivorPuzzle</div>
      </div>
      <div className={styles.controls}>
        <button 
          className={styles.difficultyButton}
          onClick={onDifficultyClick}
          title={`Difficulty: ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`}
        >
          {difficultyEmojis[difficulty]}
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