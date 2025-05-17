// src/apps/survivorpuzzle/hooks/useGameState.ts (Updated)
import { useState, useCallback } from 'react';
import { GameState } from '../types/game.types';
import { generatePuzzle, isPuzzleSolved } from '../utils/generatePuzzle';

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>({
    rows: generatePuzzle(),
    currentNumber: null,
    isComplete: false,
    startTime: null,
    isPaused: false,
    pausedTime: 0,
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
      moves: 0,
      isTimeout: false
    });
  }, []);

  // Handle row click
  const handleRowClick = useCallback((rowIndex: number) => {
    setGameState(prevState => {
      // If game is complete, do nothing
      if (prevState.isComplete) {
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
      if (prevState.startTime === null || prevState.isComplete) {
        return prevState;
      }
      
      return {
        ...prevState,
        isPaused: !prevState.isPaused,
        pausedTime: prevState.isPaused ? prevState.pausedTime : Date.now()
      };
    });
  }, []);

  return {
    gameState,
    resetGame,
    handleRowClick,
    togglePause
  };
};