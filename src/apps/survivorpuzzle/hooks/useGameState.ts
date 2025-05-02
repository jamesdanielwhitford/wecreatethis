import { useState, useCallback } from 'react';
import { GameState, Difficulty } from '../types/game.types';
import { generatePuzzle, isPuzzleSolved, getTimeLimit } from '../utils/generatePuzzle';

export const useGameState = (initialDifficulty: Difficulty = 'easy') => {
  const [gameState, setGameState] = useState<GameState>({
    rows: generatePuzzle(),
    currentNumber: null,
    isComplete: false,
    startTime: null,
    isPaused: false,
    pausedTime: 0,
    difficulty: initialDifficulty,
    timeLimit: getTimeLimit(initialDifficulty),
    moves: 0,
    isTimeout: false
  });

  // Reset the game
  const resetGame = useCallback(() => {
    setGameState({
      rows: generatePuzzle(),
      currentNumber: null,
      isComplete: false,
      startTime: null,
      isPaused: false,
      pausedTime: 0,
      difficulty: gameState.difficulty,
      timeLimit: getTimeLimit(gameState.difficulty),
      moves: 0,
      isTimeout: false
    });
  }, [gameState.difficulty]);

  // Change difficulty
  const changeDifficulty = useCallback((difficulty: Difficulty) => {
    setGameState(prevState => ({
      ...prevState,
      difficulty,
      timeLimit: getTimeLimit(difficulty)
    }));
  }, []);

  // Handle row click
  const handleRowClick = useCallback((rowIndex: number) => {
    setGameState(prevState => {
      // If game is complete or timed out, do nothing
      if (prevState.isComplete || prevState.isTimeout) {
        return prevState;
      }

      // Start the timer if it's the first move
      const newStartTime = prevState.startTime === null ? Date.now() : prevState.startTime;
      
      // Make a copy of the rows
      const newRows = [...prevState.rows.map(row => [...row])];
      const clickedRow = newRows[rowIndex];
      
      // If the current number is null, we're removing from the clicked row
      if (prevState.currentNumber === null) {
        // If the row is empty, do nothing
        if (clickedRow.length === 0) {
          return prevState;
        }
        
        // Remove the last number from the clicked row
        const removedNumber = clickedRow.pop()!;
        
        // Return the new state with the removed number as current
        return {
          ...prevState,
          rows: newRows,
          currentNumber: removedNumber,
          startTime: newStartTime,
          moves: prevState.moves + 1
        };
      } else {
        // We have a current number, we're adding to the clicked row
        
        // Add the current number to the beginning of the clicked row
        clickedRow.unshift(prevState.currentNumber);
        
        // If the row now has more than 5 numbers, remove the last one
        let newCurrentNumber = null;
        if (clickedRow.length > 5) {
          newCurrentNumber = clickedRow.pop()!;
        }
        
        // Check if the puzzle is solved
        const isComplete = isPuzzleSolved(newRows);
        
        // Return the new state
        return {
          ...prevState,
          rows: newRows,
          currentNumber: newCurrentNumber,
          isComplete,
          moves: prevState.moves + 1
        };
      }
    });
  }, []);

  // Toggle pause state
  const togglePause = useCallback(() => {
    setGameState(prevState => {
      // If game hasn't started or is complete, don't toggle
      if (prevState.startTime === null || prevState.isComplete || prevState.isTimeout) {
        return prevState;
      }
      
      return {
        ...prevState,
        isPaused: !prevState.isPaused,
        pausedTime: prevState.isPaused ? prevState.pausedTime : Date.now()
      };
    });
  }, []);

  // Handle timeout
  const handleTimeout = useCallback(() => {
    setGameState(prevState => ({
      ...prevState,
      isTimeout: true
    }));
  }, []);

  return {
    gameState,
    resetGame,
    changeDifficulty,
    handleRowClick,
    togglePause,
    handleTimeout
  };
};