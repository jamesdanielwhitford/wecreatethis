// src/apps/fifteenpuzzle/components/EndGameModal/index.tsx

import React from 'react';
import { useRouter } from 'next/navigation';
import { WinModalProps } from '../../types/game.types';
import { formatTime } from '../../utils/generatePuzzle';
import styles from './styles.module.css';

const EndGameModal: React.FC<WinModalProps> = ({
  isOpen,
  onClose,
  time,
  moves,
  date,
  onPlayInfinite,
  onShare,
  onNewGame,
  gameMode
}) => {
  const router = useRouter();

  if (!isOpen) return null;

  // Handle "Play Infinite" with URL update
  const handlePlayInfinite = () => {
    // Call the original handler
    onPlayInfinite();
    
    // Update the URL
    router.push('/15puzzle/infinite');
  };

  // Handle "New Game" for infinite mode
  const handleNewGame = () => {
    if (onNewGame) {
      onNewGame();
    }
    onClose();
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2 className={styles.modalTitle}>Puzzle Solved!</h2>
        
        <div className={styles.statsContainer}>
          <div className={styles.date}>{date}</div>
          <div className={styles.time}>{formatTime(time)}</div>
          <div className={styles.moves}>{moves} moves</div>
        </div>
        
        <div className={styles.buttonGroup}>
          <button className={styles.shareButton} onClick={onShare}>
            Share
          </button>

          {/* Show different button based on game mode */}
          {gameMode === 'daily' ? (
            <button className={styles.infiniteButton} onClick={handlePlayInfinite}>
              Play Infinite
            </button>
          ) : (
            <button className={styles.newGameButton} onClick={handleNewGame}>
              New Puzzle
            </button>
          )}
        </div>
        
        <button className={styles.closeButton} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default EndGameModal;