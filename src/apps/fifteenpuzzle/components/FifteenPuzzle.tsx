// src/apps/fifteenpuzzle/components/FifteenPuzzle.tsx

import React, { useState, useEffect } from 'react';
import { useGameState } from '../hooks/useGameState';
import { useTimer } from '../hooks/useTimer';
import Board from './Board';
import Navbar from './Navbar';
import Rules from './Rules';
import EndGameModal from './EndGameModal';
import { GameMode } from '../types/game.types';
import { formatTime } from '../utils/generatePuzzle';
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
    handleWinAnimationComplete
  } = useGameState(initialMode);

  // Pass gameState.startTime directly to useTimer with only two parameters
  const { timerState, resetTimer } = useTimer(
    gameState.startTime,
    gameState.isComplete
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

  // Handle closing the win modal
  const handleCloseWinModal = () => {
    setIsWinModalOpen(false);
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
            <div className={styles.timer}>
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
            onWinAnimationComplete={handleWinAnimationComplete}
          />
        </div>
      </main>
      
      <Rules
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />
      
      <EndGameModal
        isOpen={isWinModalOpen}
        onClose={handleCloseWinModal}
        time={timerState.elapsedTime}
        moves={gameState.moves}
        date={gameState.date}
        onPlayInfinite={handlePlayInfinite}
        onShare={() => {}} // Placeholder function since handleShare is delegated to EndGameModal
        onNewGame={handleNewGame}
        gameMode={gameState.gameMode}
      />
    </div>
  );
};

export default FifteenPuzzle;