import React from 'react';
import Link from 'next/link';
import styles from './styles.module.css';
import { EndGameModalProps } from '../../types/game.types';

export const EndGameModal: React.FC<EndGameModalProps> = ({
  show,
  onClose,
  gameWon,
  gameWord,
  finalAttempts,
  isDaily,
  onPlayAgain,
  alternateGamePath,
  alternateGameName,
  onShare
}) => {
  if (!show) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>×</button>
        
        <h2>{gameWon ? 'Congratulations!' : 'Game Over'}</h2>
        <p>
          {gameWon 
            ? `You guessed the word in ${finalAttempts} tries!` 
            : `The word was ${gameWord}`}
        </p>
        
        <div className={styles.modalButtons}>
          {!isDaily && onPlayAgain && (
            <button 
              onClick={onPlayAgain}
              className={styles.navButton}
            >
              Play Again
            </button>
          )}
          
          <Link href={alternateGamePath} className={styles.navButton}>
            Play {alternateGameName}
          </Link>
          
          <a
            href="https://www.buymeacoffee.com/jameswhitford"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.navButton}
          >
            ☕️ Buy Me a Coffee
          </a>
          
          <button onClick={onShare} className={styles.navButton}>
            Share Score
          </button>
          
          <button onClick={onClose} className={styles.navButton}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default EndGameModal;