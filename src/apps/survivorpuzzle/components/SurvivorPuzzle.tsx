// src/apps/survivorpuzzle/components/SurvivorPuzzle.tsx (Updated)
import React, { useState, useEffect } from 'react';
import { useGameState } from '../hooks/useGameState';
import { useTimer } from '../hooks/useTimer';
import Navbar from './Navbar';
import Board from './Board';
import EndGameModal from './EndGameModal';
import styles from './SurvivorPuzzle.module.css';

const SurvivorPuzzle: React.FC = () => {
  const [isEndGameModalOpen, setIsEndGameModalOpen] = useState(false);
  
  const {
    gameState,
    resetGame,
    handleRowClick
  } = useGameState();
  
  const { timerState, resetTimer } = useTimer(
    gameState.startTime,
    gameState.isComplete,
    gameState.isPaused,
    gameState.pausedTime
  );
  
  const hasGameStarted = gameState.startTime !== null;
  
  // Show end game modal when game is complete
  useEffect(() => {
    if (gameState.isComplete && !isEndGameModalOpen) {
      setIsEndGameModalOpen(true);
    }
  }, [gameState.isComplete, isEndGameModalOpen]);
  
  // Handle reset
  const handleReset = () => {
    resetGame();
    resetTimer();
    setIsEndGameModalOpen(false);
  };
  
  // Handle end game modal close
  const handleEndGameModalClose = () => {
    setIsEndGameModalOpen(false);
  };
  
  return (
    <div className={styles.container}>
      <Navbar
        onReset={handleReset}
        hasGameStarted={hasGameStarted}
      />
      
      <main className={styles.main}>
        <Board
          rows={gameState.rows}
          currentNumber={gameState.currentNumber}
          onRowClick={handleRowClick}
          timeElapsed={timerState.elapsedTime}
          isComplete={gameState.isComplete}
        />
      </main>
      
      <EndGameModal
        isOpen={isEndGameModalOpen}
        onClose={handleEndGameModalClose}
        onReset={handleReset}
        isWin={gameState.isComplete}
        timeTaken={timerState.elapsedTime}
        moves={gameState.moves}
      />
    </div>
  );
};

export default SurvivorPuzzle;