// src/apps/fifteenpuzzle/components/FifteenPuzzle.tsx

import React, { useState, useEffect } from 'react';
import { useGameState } from '../hooks/useGameState';
import { useTimer } from '../hooks/useTimer';
import Board from './Board';
import Navbar from './Navbar';
import Rules from './Rules';
import EndGameModal from './EndGameModal';
import { GameMode } from '../types/game.types';
import { prepareShareText } from '../utils/generatePuzzle';
import styles from './FifteenPuzzle.module.css';

interface FifteenPuzzleProps {
  initialMode?: GameMode;
}

const FifteenPuzzle: React.FC<FifteenPuzzleProps> = ({ initialMode = 'daily' }) => {
  // Use refs or state for modals instead of setting in render cycle
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isWinModalOpen, setIsWinModalOpen] = useState(false);
  
  const {
    gameState,
    handleTileClick,
    resetGame,
    changeGameMode,
    hasDailyBeenCompleted,
    togglePause,
    handleWinAnimationComplete
  } = useGameState(initialMode);

  const isGameStarted = gameState.moves > 0 || gameState.startTime !== null;
  
  const { timerState, resetTimer } = useTimer(
    isGameStarted,
    gameState.isComplete,
    gameState.isPaused,
    gameState.pausedTime
  );

  // Show win modal when win animation is complete
  useEffect(() => {
    if (gameState.isComplete && gameState.winAnimationComplete && !isWinModalOpen) {
      setIsWinModalOpen(true);
    }
  }, [gameState.isComplete, gameState.winAnimationComplete, isWinModalOpen]);

  // Handle mode change
  const handleModeChange = (mode: GameMode) => {
    if (mode === gameState.gameMode) return;
    
    // If changing to daily mode and it's already been completed, show message
    if (mode === 'daily' && hasDailyBeenCompleted()) {
      // Don't use alert in render cycle
      setTimeout(() => {
        alert("You've already completed today's puzzle! Try again tomorrow or play in infinite mode.");
      }, 0);
      return;
    }
    
    changeGameMode(mode);
    resetTimer();
    setIsWinModalOpen(false);
  };

  // Handle sharing results
  const handleShare = () => {
    const shareText = prepareShareText(
      timerState.elapsedTime,
      gameState.moves,
    );
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText)
        .then(() => alert("Results copied to clipboard!"))
        .catch(() => alert("Failed to copy results. Please manually copy the following:\n\n" + shareText));
    } else {
      alert("Please manually copy the following:\n\n" + shareText);
    }
  };

  // Handle playing infinite mode after completing daily
  const handlePlayInfinite = () => {
    handleModeChange('infinite');
  };

  // Handle starting a new game (used in infinite mode)
  const handleNewGame = () => {
    resetGame();
    resetTimer();
    setIsWinModalOpen(false);
  };

  // Handle pause overlay click (to resume)
  const handlePauseOverlayClick = () => {
    if (gameState.isPaused) {
      togglePause();
    }
  };

  return (
    <div className={styles.container}>
      <Navbar
        gameMode={gameState.gameMode}
        onModeChange={handleModeChange}
        onRulesClick={() => setIsRulesOpen(true)}
      />
      
      <main className={styles.main}>
        <div className={styles.gameControls}>
          <div className={styles.timerAndMoves}>
            <div 
              className={`
                ${styles.timer} 
                ${timerState.isRunning ? styles.running : ''} 
                ${gameState.isPaused ? styles.paused : ''}
              `}
              onClick={togglePause}
            >
              {gameState.isPaused ? (
                <span className={styles.pauseIcon}>⏵</span>
              ) : timerState.isRunning ? (
                <span className={styles.pauseIcon}>⏸</span>
              ) : null}
              <span className={styles.timeDisplay}>{formatTime(timerState.elapsedTime)}</span>
            </div>
            
            <div className={styles.movesCounter}>
              <span>{gameState.moves + " moves"}</span>
            </div>
            
            {gameState.gameMode === 'infinite' && !gameState.isComplete && (
              <div className={styles.resetContainer}>
                <button 
                  className={styles.resetButton}
                  onClick={handleNewGame}
                  title="New Puzzle"
                >
                  <span className={styles.resetIcon}>↻</span>
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className={styles.boardContainer}>
          <Board
            tiles={gameState.tiles}
            onTileClick={handleTileClick}
            isComplete={gameState.isComplete}
            isPaused={gameState.isPaused}
            onWinAnimationComplete={handleWinAnimationComplete}
          />
          
          {gameState.isPaused && (
            <div className={styles.pauseOverlay} onClick={handlePauseOverlayClick}>
              <div className={styles.pauseMessage}>
                <span className={styles.pauseIcon}>⏵</span>
                <span>PAUSED</span>
                <p className={styles.pauseInstructions}>Tap to resume</p>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <Rules
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />
      
      <EndGameModal
        isOpen={isWinModalOpen}
        onClose={() => setIsWinModalOpen(false)}
        time={timerState.elapsedTime}
        moves={gameState.moves}
        date={gameState.date}
        onPlayInfinite={handlePlayInfinite}
        onShare={handleShare}
        onNewGame={handleNewGame}
        gameMode={gameState.gameMode}
      />
    </div>
  );
};

// Helper function for formatting time
const formatTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export default FifteenPuzzle;