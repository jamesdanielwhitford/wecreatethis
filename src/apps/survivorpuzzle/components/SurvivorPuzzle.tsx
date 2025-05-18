import React, { useState, useEffect } from 'react';
import { useGameState } from '../hooks/useGameState';
import { useTimer } from '../hooks/useTimer';
import Navbar from './Navbar';
import Board from './Board';
import EndGameModal from './EndGameModal';
import LeaderboardModal from '../../../utils/components/LeaderboardModal'; // Import the new component
import styles from './SurvivorPuzzle.module.css';

const SurvivorPuzzle: React.FC = () => {
  const [isEndGameModalOpen, setIsEndGameModalOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false); // Add this state
  
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
  
  // Handle leaderboard toggle
  const handleLeaderboardToggle = () => {
    setIsLeaderboardOpen(prev => !prev);
  };
  
  return (
    <div className={styles.container}>
      <Navbar
        onReset={handleReset}
        hasGameStarted={hasGameStarted}
        onLeaderboardClick={handleLeaderboardToggle} // Add this prop
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
      
      {/* Add the Leaderboard Modal */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        gameType="survivorPuzzle" // Use the correct game type
        title="Survivor Puzzle Leaderboard"
        options={{ 
          scoreOrder: 'asc' // Lower time is better
        }}
      />
    </div>
  );
};

export default SurvivorPuzzle;