import React, { useState, useEffect } from 'react';
import { useGameState } from '../hooks/useGameState';
import { useTimer } from '../hooks/useTimer';
import { Difficulty } from '../types/game.types';
import Navbar from './Navbar';
import Board from './Board';
import DifficultyModal from './DifficultyModal';
import EndGameModal from './EndGameModal';
import styles from './SurvivorPuzzle.module.css';

const SurvivorPuzzle: React.FC = () => {
  const [isDifficultyModalOpen, setIsDifficultyModalOpen] = useState(false);
  const [isEndGameModalOpen, setIsEndGameModalOpen] = useState(false);
  
  const {
    gameState,
    resetGame,
    changeDifficulty,
    handleRowClick,
    handleTimeout
  } = useGameState();
  
  const { timerState, resetTimer } = useTimer(
    gameState.startTime,
    gameState.isComplete,
    gameState.isPaused,
    gameState.pausedTime,
    gameState.timeLimit,
    handleTimeout
  );
  
  const hasGameStarted = gameState.startTime !== null;
  
  // Show end game modal when game is complete or timed out
  useEffect(() => {
    if ((gameState.isComplete || gameState.isTimeout) && !isEndGameModalOpen) {
      setIsEndGameModalOpen(true);
    }
  }, [gameState.isComplete, gameState.isTimeout, isEndGameModalOpen]);
  
  // Handle difficulty change
  const handleDifficultyChange = (difficulty: Difficulty) => {
    changeDifficulty(difficulty);
    setIsDifficultyModalOpen(false);
    
    // If game has started, reset it with the new difficulty
    if (hasGameStarted) {
      resetGame();
      resetTimer();
    }
  };
  
  // Handle reset
  const handleReset = () => {
    resetGame();
    resetTimer();
    setIsEndGameModalOpen(false);
  };
  
  return (
    <div className={styles.container}>
      <Navbar
        difficulty={gameState.difficulty}
        onDifficultyClick={() => setIsDifficultyModalOpen(true)}
        onReset={handleReset}
        hasGameStarted={hasGameStarted}
      />
      
      <main className={styles.main}>
        <Board
          rows={gameState.rows}
          currentNumber={gameState.currentNumber}
          onRowClick={handleRowClick}
          timeRemaining={timerState.elapsedTime}
          isComplete={gameState.isComplete}
          isTimeout={gameState.isTimeout}
        />
      </main>
      
      <DifficultyModal
        isOpen={isDifficultyModalOpen}
        onClose={() => setIsDifficultyModalOpen(false)}
        onSelectDifficulty={handleDifficultyChange}
        currentDifficulty={gameState.difficulty}
      />
      
      <EndGameModal
        isOpen={isEndGameModalOpen}
        onClose={() => setIsEndGameModalOpen(false)}
        onReset={handleReset}
        isWin={gameState.isComplete}
        timeRemaining={timerState.elapsedTime}
        moves={gameState.moves}
      />
    </div>
  );
};

export default SurvivorPuzzle;