// src/apps/fifteenpuzzle/components/Rules/index.tsx

import React from 'react';
import { RulesModalProps } from '../../types/game.types';
import styles from './styles.module.css';

const Rules: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2 className={styles.modalTitle}>How to Play 15-Puzzle</h2>
        
        <div className={styles.rulesSection}>
          <h3 className={styles.sectionTitle}>Objective</h3>
          <p className={styles.text}>Arrange the tiles in numerical order, either starting or ending with the empty space.</p>
          
          <h3 className={styles.sectionTitle}>Game Modes</h3>
          <h4 className={styles.sectionSubtitle}>Daily Mode</h4>
          <p className={styles.text}>
            A new puzzle is available each day. Your progress is saved.
            Once completed, you&apos;ll need to wait until the next day for a new puzzle.
          </p>
          
          <h4 className={styles.sectionSubtitle}>Infinite Mode</h4>
          <p className={styles.text}>
            Play as many different puzzles as you like. Each time you restart,
            a new random puzzle will be generated.
          </p>
          
          <h3 className={styles.sectionTitle}>How to Play</h3>
          <ul className={styles.rulesList}>
            <li className={styles.text}>Tap on a tile adjacent to the empty space to move it.</li>
            <li className={styles.text}>The timer starts when you make your first move.</li>
            <li className={styles.text}>The game ends when all tiles are in order.</li>
          </ul>
          
          <h3 className={styles.sectionTitle}>Winning Conditions</h3>
          <p className={styles.text}>
            The puzzle is solved when the tiles are in numerical order, with
            either the empty space at the beginning or at the end.
          </p>
        </div>
        
        <button className={styles.closeButton} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default Rules;