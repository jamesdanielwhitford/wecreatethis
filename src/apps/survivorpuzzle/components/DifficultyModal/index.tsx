// src/apps/survivorpuzzle/components/DifficultyModal/index.tsx
import React from 'react';
import { Difficulty } from '../../types/game.types';
import styles from './styles.module.css';

interface DifficultyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDifficulty: (difficulty: Difficulty) => void;
  currentDifficulty: Difficulty;
}

const DifficultyModal: React.FC<DifficultyModalProps> = ({
  isOpen,
  onClose,
  onSelectDifficulty,
  currentDifficulty
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2 className={styles.modalTitle}>Select Difficulty</h2>
        
        <div className={styles.difficultyOptions}>
          <button 
            className={`${styles.difficultyButton} ${currentDifficulty === 'none' ? styles.selected : ''}`}
            onClick={() => onSelectDifficulty('none')}
          >
            No Time Limit ⏱️
          </button>
          
          <button 
            className={`${styles.difficultyButton} ${currentDifficulty === 'easy' ? styles.selected : ''}`}
            onClick={() => onSelectDifficulty('easy')}
          >
            Easy (5 minutes) 😀
          </button>
          
          <button 
            className={`${styles.difficultyButton} ${currentDifficulty === 'medium' ? styles.selected : ''}`}
            onClick={() => onSelectDifficulty('medium')}
          >
            Medium (3 minutes) 😐
          </button>
          
          <button 
            className={`${styles.difficultyButton} ${currentDifficulty === 'difficult' ? styles.selected : ''}`}
            onClick={() => onSelectDifficulty('difficult')}
          >
            Difficult (1 minute) 😰
          </button>
        </div>
        
        <button 
          className={styles.closeButton}
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default DifficultyModal;