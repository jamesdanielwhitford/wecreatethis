import React from 'react';
import styles from './styles.module.css';

interface EndGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReset: () => void;
  isWin: boolean;
  timeRemaining: number;
  moves: number;
}

const EndGameModal: React.FC<EndGameModalProps> = ({
  isOpen,
  onClose,
  onReset,
  isWin,
  timeRemaining,
  moves
}) => {
  if (!isOpen) return null;

  // Format time remaining as MM:SS
  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2 className={`${styles.modalTitle} ${isWin ? styles.win : styles.loss}`}>
          {isWin ? 'Puzzle Solved!' : 'Time\'s Up!'}
        </h2>
        
        {isWin ? (
          <div className={styles.stats}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Time Remaining:</span>
              <span className={styles.statValue}>{formatTime(timeRemaining)}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Moves:</span>
              <span className={styles.statValue}>{moves}</span>
            </div>
          </div>
        ) : (
          <p className={styles.lossMessage}>
            Better luck next time!
          </p>
        )}
        
        <div className={styles.buttons}>
          <button 
            className={styles.resetButton}
            onClick={onReset}
          >
            Play Again
          </button>
          
          <button 
            className={styles.closeButton}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default EndGameModal;