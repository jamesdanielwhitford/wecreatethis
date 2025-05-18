import React from 'react';
import HighScoreBoard from '../HighScoreBoard';
import { GameType } from '../../firebase/types';
import styles from './styles.module.css';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameType: GameType;
  title?: string;
  options?: {
    scoreOrder?: 'asc' | 'desc';
    category?: string;
    wordGameType?: string;
  };
}

const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  gameType,
  title,
  options = {}
}) => {
  if (!isOpen) return null;

  // Prevent clicks inside the modal from closing it
  const handleModalContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={handleModalContentClick}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title || 'Leaderboard'}</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        
        <div className={styles.leaderboardContainer}>
          <HighScoreBoard 
            gameType={gameType}
            options={options}
            title=""  // We already have a title in the modal header
          />
        </div>
      </div>
    </div>
  );
};

export default LeaderboardModal;