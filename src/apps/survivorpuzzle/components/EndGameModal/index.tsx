// src/apps/survivorpuzzle/components/EndGameModal/index.tsx (Updated with new score highlighting)
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
  // New state to store the ID of the submitted score
  const [submittedScoreId, setSubmittedScoreId] = useState<string | undefined>(undefined);
  
  // Effect to reset state when modal opens/closes - depends ONLY on isOpen
  useEffect(() => {
    if (!isOpen) {
      // Reset all state when modal closes
      setIsHighScore(false);
      setShowHighScores(false);
      setScoreSubmitted(false);
      setIsSubmittingScore(false);
      setSubmittedScoreId(undefined);
      console.log('🔄 Resetting all modal state variables (modal closed)');
    }
  }, [isOpen]); // This will ONLY run when isOpen changes

  // Separate effect for high score checking - only runs when modal is open
  useEffect(() => {
    // Skip if modal is not open
    if (!isOpen) return;
    
    // Check if this is a high score when the game is won
    const checkHighScore = async () => {
      if (isWin) {
        console.log('🔍 Checking high score with time:', timeTaken, 'ms (', formatTime(timeTaken), ') and moves:', moves);
        try {
          // Now passing moves for the tiebreaker
          const isHighScore = await highScoreService.checkHighScore(
            'survivorPuzzle', 
            timeTaken, 
            { scoreOrder: 'asc' }, // Lower time is better
            moves // Pass moves for proper checking
          );
          
          console.log('🏆 High score check result:', isHighScore);
          
          // Update both states in a more predictable way
          setIsHighScore(isHighScore);
          
          // Only show high scores if NOT a high score
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
      } else {
        // Always show high scores for non-win
        console.log('📋 Always showing high scores for non-win');
        setIsHighScore(false);
        setShowHighScores(true);
        setScoreSubmitted(false);
      }
    };
    
    if (isWin) {
      // Make sure state is reset properly before checking
      checkHighScore();
    }
  }, [isOpen, isWin, timeTaken, moves]); // This will run when any of these change, but only if isOpen is true

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
    console.log(`📝 Submitting high score for ${name} with time ${timeTaken} and moves ${moves}`);
    
    try {
      const result = await highScoreService.addSurvivorPuzzleHighScore(
        name,
        timeTaken,
        moves
      );
      
      if (result) {
        console.log(`✅ High score submitted successfully with ID: ${result}`);
        // Store the submitted score ID for highlighting
        setSubmittedScoreId(result);
        setScoreSubmitted(true);
        setIsHighScore(false); // No longer need to show form
        setShowHighScores(true); // Now show high scores
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
  
  // Handle play again button (close modal and reset game)
  const handlePlayAgain = () => {
    onReset();
    // No need to call onClose here as onReset will reset the game and close the modal
  };
  
  // Cancel high score submission
  const handleCancelHighScore = () => {
    console.log('❌ High score entry canceled by user');
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
            {/* Add a high score indicator */}
            {isHighScore && (
              <div className={styles.highScoreIndicator}>
                🏆 New High Score! 🏆
              </div>
            )}
          </div>
        ) : (
          <p className={styles.lossMessage}>
            Better luck next time!
          </p>
        )}
        
        {/* High Score Entry Form - Make condition more explicit */}
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
              gameType="survivorPuzzle" 
              options={{ 
                scoreOrder: 'asc' // Lower time is better
              }}
              title="HIGH SCORES"
              newScoreId={submittedScoreId} // Pass the ID of the newly submitted score
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