// src/apps/fifteenpuzzle/components/EndGameModal/index.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WinModalProps } from '../../types/game.types';
import { formatTime } from '../../utils/generatePuzzle';
import styles from './styles.module.css';
import HighScoreEntry from '../../../../utils/components/HighScoreEntry';
import HighScoreBoard from '../../../../utils/components/HighScoreBoard';
import { highScoreService } from '../../../../utils/firebase/highScoreService';

const EndGameModal: React.FC<WinModalProps> = ({
  isOpen,
  onClose,
  time,
  moves,
  date,
  onPlayInfinite,
  // onShare,
  onNewGame,
  gameMode
}) => {
  const router = useRouter();
  const [isHighScore, setIsHighScore] = useState<boolean>(false);
  const [isSubmittingScore, setIsSubmittingScore] = useState<boolean>(false);
  const [showHighScores, setShowHighScores] = useState<boolean>(false);
  const [scoreSubmitted, setScoreSubmitted] = useState<boolean>(false);
  const [submittedScoreId, setSubmittedScoreId] = useState<string | undefined>(undefined);
  const [showStats, setShowStats] = useState<boolean>(true);
  
  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      // Reset all state when modal closes
      setIsHighScore(false);
      setShowHighScores(false);
      setScoreSubmitted(false);
      setIsSubmittingScore(false);
      setSubmittedScoreId(undefined);
      setShowStats(true);
    } else {
      // When modal opens, check for high score
      checkHighScore();
    }
  }, [isOpen]);

  // Check if this is a high score
  const checkHighScore = async () => {
    try {
      // Create category based on game mode
      const category = `fifteenPuzzle-${gameMode}`;
      
      console.log(`🔍 Checking high score with time: ${time} ms (${formatTime(time)}) and moves: ${moves}`);
      
      // Check if this qualifies as a high score
      const isHighScore = await highScoreService.checkHighScore(
        'fifteenPuzzle',
        time,
        {
          scoreOrder: 'asc', // Lower time is better
          category: category
        },
        moves // Pass moves for tiebreaker
      );
      
      console.log('🏆 High score check result:', isHighScore);
      
      setIsHighScore(isHighScore);
      
      // Only show high scores if NOT a high score initially
      if (!isHighScore) {
        setShowHighScores(true);
        console.log('📋 Showing high scores (not a high score)');
      } else {
        setShowHighScores(false);
        console.log('🏆 Showing high score entry form');
      }
      
      setScoreSubmitted(false);
    } catch (error) {
      console.error('❌ Error checking high score:', error);
      setIsHighScore(false);
      setShowHighScores(true); // Show high scores on error
      setScoreSubmitted(false);
    }
  };

  // Handle high score submission
  const handleHighScoreSubmit = async (name: string) => {
    setIsSubmittingScore(true);
    console.log(`📝 Submitting high score for ${name} with time ${time} and moves ${moves}`);
    
    try {
      const result = await highScoreService.addFifteenPuzzleHighScore(
        name,
        time,
        moves,
        gameMode
      );
      
      if (result) {
        console.log(`✅ High score submitted successfully with ID: ${result}`);
        // Store the submitted score ID for highlighting
        setSubmittedScoreId(result);
        setScoreSubmitted(true);
        setIsHighScore(false); // No longer need to show form
        setShowHighScores(true); // Now show high scores
        setShowStats(false); // Hide stats to make room for high scores
      } else {
        // Score didn't qualify or there was an issue
        console.log('❌ Score was not high enough to be added to leaderboard');
        setIsHighScore(false);
        setShowHighScores(true);
      }
    } catch (error) {
      console.error('❌ Error submitting high score:', error);
      // Show an error message to the user
      alert('There was an error submitting your high score. Please try again later.');
      setIsHighScore(false);
      setShowHighScores(true);
    } finally {
      setIsSubmittingScore(false);
    }
  };
  
  // Cancel high score submission
  const handleCancelHighScore = () => {
    console.log('❌ High score entry canceled by user');
    setIsHighScore(false);
    setShowHighScores(true);
  };

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
    // Use the updated formatTime function from utils to include hundredths of a second
    const timeFormatted = formatTime(time);
    const emoji = getPerformanceEmoji();
    const modeText = gameMode === 'daily' ? `Daily Puzzle (${formattedDate})` : 'Infinite Mode';
    
    const shareText = `${emoji} 15 Puzzle ${emoji}\n\n` +
      `${modeText}\n` +
      `⏱️ Time: ${timeFormatted}\n\n` +
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

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modalContent} ${isHighScore || showHighScores ? styles.expanded : ''}`}>
        <h2 className={styles.modalTitle}>Puzzle Solved!</h2>
        
        {showStats && (
          <div className={styles.statsContainer}>
            <div className={styles.date}>{new Date(date).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long', 
              day: 'numeric',
              year: 'numeric'
            })}</div>
            <div className={styles.time}>{formatTime(time)}</div>
            <div className={styles.moves}>{moves} moves</div>
            
            {/* High score indicator */}
            {isHighScore && (
              <div className={styles.highScoreIndicator}>
                🏆 New High Score! 🏆
              </div>
            )}
          </div>
        )}
        
        {/* High Score Entry Form */}
        {isHighScore && !scoreSubmitted && (
          <div className={styles.highScoreSection}>
            <h3>You&apos;ve earned a spot on the leaderboard!</h3>
            <HighScoreEntry 
              onSubmit={handleHighScoreSubmit} 
              onCancel={handleCancelHighScore} 
            />
            {isSubmittingScore && (
              <div className={styles.submitting}>Submitting score...</div>
            )}
          </div>
        )}
        
        {/* High Score Board - Pass submittedScoreId for highlighting */}
        {showHighScores && (
          <div className={styles.highScoreSection}>
            <HighScoreBoard 
              gameType="fifteenPuzzle" 
              options={{ 
                scoreOrder: 'asc', // Lower time is better
                category: `fifteenPuzzle-${gameMode}` // Filter by game mode
              }}
              title={`${gameMode.toUpperCase()} HIGH SCORES`}
              newScoreId={submittedScoreId} // Pass the ID of the newly submitted score
            />
          </div>
        )}
        
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