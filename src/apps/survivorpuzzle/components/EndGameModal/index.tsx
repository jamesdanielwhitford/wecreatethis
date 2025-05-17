// src/apps/survivorpuzzle/components/EndGameModal/index.tsx (Updated)
import React, { useState, useEffect } from 'react';
import styles from './styles.module.css';
import HighScoreEntry from '../../../../utils/components/HighScoreEntry';
import HighScoreBoard from '../../../../utils/components/HighScoreBoard';
import { highScoreService } from '../../../../utils/firebase/highScoreService';

interface EndGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReset: () => void;
  isWin: boolean;
  timeTaken: number;
  moves: number;
}

const EndGameModal: React.FC<EndGameModalProps> = ({
  isOpen,
  onReset,
  isWin,
  timeTaken,
  moves
}) => {
  const [isHighScore, setIsHighScore] = useState<boolean>(false);
  const [isSubmittingScore, setIsSubmittingScore] = useState<boolean>(false);
  const [showHighScores, setShowHighScores] = useState<boolean>(false);
  const [scoreSubmitted, setScoreSubmitted] = useState<boolean>(false);
  
  useEffect(() => {
    // Check if this is a high score when the game is won
    const checkHighScore = async () => {
      if (isWin) {
        try {
          const isHighScore = await highScoreService.checkHighScore('survivorPuzzle', timeTaken, { 
            scoreOrder: 'asc' // Lower time is better 
          });
          
          setIsHighScore(isHighScore);
          setShowHighScores(!isHighScore); // Show high scores immediately if not a high score
        } catch (error) {
          console.error('Error checking high score:', error);
          setIsHighScore(false);
          setShowHighScores(false); // Don't show high scores on error
        }
      } else {
        // Always show high scores for non-win
        setIsHighScore(false);
        setShowHighScores(true);
      }
    };
    
    if (isOpen && isWin) {
      checkHighScore();
    }
  }, [isOpen, isWin, timeTaken]);

  if (!isOpen) return null;

  // Format time as MM:SS.MS
  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const ms = Math.floor((milliseconds % 1000) / 10); // Get hundredths of a second
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // Handle high score submission
  const handleHighScoreSubmit = async (name: string) => {
    setIsSubmittingScore(true);
    
    try {
      const result = await highScoreService.addSurvivorPuzzleHighScore(
        name,
        timeTaken,
        moves
      );
      
      if (result) {
        setScoreSubmitted(true);
        setShowHighScores(true);
      } else {
        // Score didn't qualify or there was an issue
        console.log('Score was not high enough to be added to leaderboard');
        setIsHighScore(false);
        setShowHighScores(true);
      }
    } catch (error) {
      console.error('Error submitting high score:', error);
      // Show an error message to the user
      alert('There was an error submitting your high score. Please try again later.');
      setIsHighScore(false);
      setShowHighScores(true);
    } finally {
      setIsSubmittingScore(false);
    }
  };
  
  // Handle play again button (close modal and reset game)
  const handlePlayAgain = () => {
    onReset();
    // No need to call onClose here as onReset will reset the game and close the modal
  };
  
  // Cancel high score submission
  const handleCancelHighScore = () => {
    setIsHighScore(false);
    setShowHighScores(true);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modalContent} ${isHighScore || showHighScores ? styles.expanded : ''}`}>
        <h2 className={`${styles.modalTitle} ${isWin ? styles.win : styles.loss}`}>
          {isWin ? 'Puzzle Solved!' : 'Game Over'}
        </h2>
        
        {isWin ? (
          <div className={styles.stats}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Time Taken:</span>
              <span className={styles.statValue}>{formatTime(timeTaken)}</span>
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
        
        {/* High Score Entry Form */}
        {isHighScore && !scoreSubmitted && (
          <div className={styles.highScoreSection}>
            <HighScoreEntry 
              onSubmit={handleHighScoreSubmit} 
              onCancel={handleCancelHighScore} 
            />
            {isSubmittingScore && (
              <div className={styles.submitting}>Submitting score...</div>
            )}
          </div>
        )}
        
        {/* High Score Board */}
        {showHighScores && (
          <div className={styles.highScoreSection}>
            <HighScoreBoard 
              gameType="survivorPuzzle" 
              options={{ 
                scoreOrder: 'asc' // Lower time is better
              }}
              title="HIGH SCORES"
            />
          </div>
        )}
        
        <div className={styles.buttons}>
          <button 
            className={styles.resetButton}
            onClick={handlePlayAgain}
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
};

export default EndGameModal;