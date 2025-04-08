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

  // Handle share functionality using Web Share API
  const handleShare = () => {
    // Create emoji grade based on moves and time
    // Lower moves and time = better grade
    const getPerformanceEmoji = () => {
      const totalSeconds = Math.floor(time / 1000);
      
      // Simplified grading system based on moves and time
      if (moves < 100 && totalSeconds < 60) return '🏆'; // Trophy for excellent performance
      if (moves < 150 && totalSeconds < 120) return '🌟'; // Star for great performance
      if (moves < 200 && totalSeconds < 180) return '👍'; // Thumbs up for good performance
      return '🟦'; // Blue Square for completion
    };

    // Format date for display
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
    
    // Create a nicely formatted share text with emojis and structure
    const formattedTime = formatTime(time);
    const emoji = getPerformanceEmoji();
    const modeText = gameMode === 'daily' ? `Daily Puzzle (${formattedDate})` : 'Infinite Mode';
    
    const shareText = `${emoji} 15 Puzzle ${emoji}\n\n` +
      `${modeText}\n` +
      `⏱️ Time: ${formattedTime}\n\n` +
      `🧩 Moves: ${moves}\n\n` +
      `Play at: wecreatethis.com/15puzzle`;
    
    // Use Web Share API if available
    if (navigator.share) {
      navigator.share({
        title: '15 Puzzle Results',
        text: shareText,
        url: 'https://wecreatethis.com/15puzzle'
      })
      .catch(error => {
        console.error('Error sharing:', error);
        // Fallback to clipboard
        if (navigator.clipboard) {
          navigator.clipboard.writeText(shareText)
            .then(() => alert("Results copied to clipboard!"))
            .catch(() => alert("Failed to copy results. Please manually copy the following:\n\n" + shareText));
        } else {
          alert("Please manually copy the following:\n\n" + shareText);
        }
      });
    } else {
      // Fallback for browsers that don't support Web Share API
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareText)
          .then(() => alert("Results copied to clipboard!"))
          .catch(() => alert("Failed to copy results. Please manually copy the following:\n\n" + shareText));
      } else {
        alert("Please manually copy the following:\n\n" + shareText);
      }
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2 className={styles.modalTitle}>Puzzle Solved!</h2>
        
        <div className={styles.statsContainer}>
          <div className={styles.date}>{new Date(date).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long', 
            day: 'numeric',
            year: 'numeric'
          })}</div>
          <div className={styles.time}>{formatTime(time)}</div>
          <div className={styles.moves}>{moves} moves</div>
        </div>
        
        <div className={styles.buttonGroup}>
          <button className={styles.shareButton} onClick={handleShare}>
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