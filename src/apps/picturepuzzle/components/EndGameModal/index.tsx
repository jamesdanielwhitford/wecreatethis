// src/apps/picturepuzzle/components/EndGameModal/index.tsx

import React from 'react';
import { useRouter } from 'next/navigation';
import { WinModalProps } from '../../types/games.types';
import styles from './styles.module.css';

const EndGameModal: React.FC<WinModalProps> = ({
  isOpen,
  onClose,
  time,
  moves,
  date,
  onPlayInfinite,
  onNewGame,
  gameMode,
  imageSrc
}) => {
  const router = useRouter();

  if (!isOpen) return null;

  // Format time helper function
  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle "Play Infinite" with URL update
  const handlePlayInfinite = () => {
    // Call the original handler
    onPlayInfinite();
    
    // Update the URL
    router.push('/picturepuzzle/infinite');
  };
  
  // Handle "Play Impossible" with URL update
  const handlePlayImpossible = () => {
    // Update the URL
    router.push('/picturepuzzle/impossible');
  };

  // Handle "New Game" for infinite/impossible mode
  const handleNewGame = () => {
    if (onNewGame) {
      onNewGame();
    }
    onClose();
  };

  // Handle share functionality using Web Share API
  const handleShare = () => {
    // Create emoji grade based on moves and time
    const getPerformanceEmoji = () => {
      const totalSeconds = Math.floor(time / 1000);
      
      // Special emoji for impossible mode
      if (gameMode === 'impossible') return '🧠'; // Brain emoji
      
      // Simplified grading system based on moves and time
      if (moves < 100 && totalSeconds < 60) return '🏆'; // Trophy for excellent performance
      if (moves < 150 && totalSeconds < 120) return '🌟'; // Star for great performance
      if (moves < 200 && totalSeconds < 180) return '👍'; // Thumbs up for good performance
      return '🖼️'; // Image for completion
    };

    // Format date for display
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
    
    // Create a nicely formatted share text
    const formattedTime = formatTime(time);
    const emoji = getPerformanceEmoji();
    
    let modeText;
    if (gameMode === 'daily') {
      modeText = `Daily Picture Puzzle (${formattedDate})`;
    } else if (gameMode === 'impossible') {
      modeText = `IMPOSSIBLE Picture Puzzle 💀`;
    } else {
      modeText = 'Infinite Picture Puzzle';
    }
    
    const shareText = `${emoji} Picture Puzzle ${emoji}\n\n` +
      `${modeText}\n` +
      `⏱️ Time: ${formattedTime}\n\n` +
      `🧩 Moves: ${moves}\n\n` +
      `Play at: wecreatethis.com/picturepuzzle`;
    
    // Use Web Share API if available
    if (navigator.share) {
      navigator.share({
        title: 'Picture Puzzle Results',
        text: shareText,
        url: 'https://wecreatethis.com/picturepuzzle'
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

  // Determine which additional action button to show based on current mode
  const renderActionButton = () => {
    if (gameMode === 'daily') {
      return (
        <>
          <button className={styles.infiniteButton} onClick={handlePlayInfinite}>
            Play Infinite
          </button>
          <button className={styles.impossibleButton} onClick={handlePlayImpossible}>
            Try Impossible
          </button>
        </>
      );
    } else if (gameMode === 'infinite') {
      return (
        <>
          <button className={styles.impossibleButton} onClick={handlePlayImpossible}>
            Try Impossible
          </button>
          <button className={styles.newGameButton} onClick={handleNewGame}>
            New Puzzle
          </button>
        </>
      );
    } else {
      // Impossible mode
      return (
        <button className={styles.newGameButton} onClick={handleNewGame}>
          New Puzzle
        </button>
      );
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2 className={styles.modalTitle}>
          {gameMode === 'impossible' ? (
            <>Impossible Puzzle Solved! <span role="img" aria-label="skull">💀</span></>
          ) : (
            'Puzzle Solved!'
          )}
        </h2>
        
        <div className={styles.completedImageContainer}>
          <div 
            className={styles.completedImage}
            style={{
              backgroundImage: `url(${imageSrc})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
        </div>
        
        <div className={styles.statsContainer}>
          <div className={styles.date}>{new Date(date).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long', 
            day: 'numeric',
            year: 'numeric'
          })}</div>
          <div className={styles.time}>{formatTime(time)}</div>
          <div className={styles.moves}>{moves} moves</div>
          
          {gameMode === 'impossible' && (
            <div className={styles.impossibleBadge}>
              IMPOSSIBLE MODE COMPLETED
            </div>
          )}
        </div>
        
        <div className={styles.buttonGroup}>
          <button className={styles.shareButton} onClick={handleShare}>
            Share
          </button>

          {renderActionButton()}
        </div>
        
        <button className={styles.closeButton} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default EndGameModal;