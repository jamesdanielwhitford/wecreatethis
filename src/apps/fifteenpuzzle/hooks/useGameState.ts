// src/apps/fifteenpuzzle/hooks/useGameState.ts

import { useState, useEffect, useCallback } from 'react';
import { GameState, GameMode } from '../types/game.types';
import { 
  generateSolvablePuzzleByShufflingBlank, 
  isPuzzleComplete, 
  isValidMove, 
  getDailySeed,
  getCurrentDate
} from '../utils/generatePuzzle';

const STORAGE_KEY_DAILY = 'fifteenpuzzle-daily-state';
const STORAGE_KEY_INFINITE = 'fifteenpuzzle-infinite-state';
const STORAGE_KEY_PLAYED_DATE = 'fifteenpuzzle-played-date';

// Create a new game state with the specified mode
const createNewGame = (mode: GameMode): GameState => {
  const date = getCurrentDate();
  // Ensure we have a unique seed for infinite mode
  const seed = mode === 'daily' ? getDailySeed() : `infinite-${Date.now()}-${Math.random()}`;
  
  // Generate the tile arrangement
  const tiles = generateSolvablePuzzleByShufflingBlank(seed);
  
  // Ensure we have the empty tile position
  const emptyTile = tiles.find(tile => tile.value === 0);
  const emptyTilePosition = emptyTile ? emptyTile.position : 0;
  
  return {
    tiles,
    emptyTilePosition,
    moves: 0,
    isComplete: false,
    startTime: null,
    endTime: null,
    gameMode: mode,
    seed,
    date,
    isPaused: false,
    pausedTime: 0,
    lastPausedAt: null,
    winAnimationComplete: false
  };
};

export const useGameState = (initialMode: GameMode = 'daily') => {
  // Initialize state outside of useState to avoid the error
  const getInitialState = (): GameState => {
    // Only try to access localStorage in the browser
    if (typeof window !== 'undefined') {
      try {
        const storageKey = initialMode === 'daily' ? STORAGE_KEY_DAILY : STORAGE_KEY_INFINITE;
        const savedState = localStorage.getItem(storageKey);
        
        if (savedState) {
          const parsedState = JSON.parse(savedState) as GameState;
          
          // For daily mode, check if it's today's puzzle
          if (initialMode === 'daily') {
            const playedDate = localStorage.getItem(STORAGE_KEY_PLAYED_DATE);
            if (playedDate !== getCurrentDate()) {
              // It's a new day, create a new daily puzzle
              return createNewGame('daily');
            }
          }
          
          // Validate the loaded state
          if (parsedState.tiles.length === 16) {
            // If we had a completed game, reset win animation state on reload
            if (parsedState.isComplete) {
              parsedState.winAnimationComplete = false;
            }
            return parsedState;
          }
        }
      } catch (error) {
        console.error('Error accessing localStorage:', error);
      }
    }
    
    // Create a new game as fallback
    return createNewGame(initialMode);
  };

  const [gameState, setGameState] = useState<GameState>(getInitialState);

  // Save game state to local storage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storageKey = gameState.gameMode === 'daily' ? STORAGE_KEY_DAILY : STORAGE_KEY_INFINITE;
        localStorage.setItem(storageKey, JSON.stringify(gameState));
        
        if (gameState.gameMode === 'daily') {
          localStorage.setItem(STORAGE_KEY_PLAYED_DATE, gameState.date);
        }
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    }
  }, [gameState]);

  // Handle the completion of win animation
  const handleWinAnimationComplete = useCallback(() => {
    setGameState(prevState => ({
      ...prevState,
      winAnimationComplete: true
    }));
  }, []);

  // Handle pausing the game
  const togglePause = useCallback(() => {
    setGameState(prevState => {
      // Can't pause if the game is complete or not started
      if (prevState.isComplete || prevState.moves === 0) {
        return prevState;
      }
      
      const now = Date.now();
      
      if (prevState.isPaused) {
        // Unpause: add the time spent paused to pausedTime
        const additionalPausedTime = prevState.lastPausedAt 
          ? now - prevState.lastPausedAt 
          : 0;
          
        return {
          ...prevState,
          isPaused: false,
          pausedTime: prevState.pausedTime + additionalPausedTime,
          lastPausedAt: null
        };
      } else {
        // Pause the game
        return {
          ...prevState,
          isPaused: true,
          lastPausedAt: now
        };
      }
    });
  }, []);

  // Handle page visibility changes to auto-pause when page is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !gameState.isPaused && !gameState.isComplete && gameState.moves > 0) {
        togglePause();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [gameState.isPaused, gameState.isComplete, gameState.moves, togglePause]);

  // Handle changing game mode
  const changeGameMode = useCallback((mode: GameMode) => {
    if (mode === gameState.gameMode) return;
    
    // Load the saved state for the selected mode if it exists
    if (typeof window !== 'undefined') {
      try {
        const storageKey = mode === 'daily' ? STORAGE_KEY_DAILY : STORAGE_KEY_INFINITE;
        const savedState = localStorage.getItem(storageKey);
        
        if (savedState) {
          const parsedState = JSON.parse(savedState) as GameState;
          
          // For daily mode, check if it's today's puzzle
          if (mode === 'daily') {
            const playedDate = localStorage.getItem(STORAGE_KEY_PLAYED_DATE);
            if (playedDate !== getCurrentDate()) {
              // It's a new day, create a new daily puzzle
              setGameState(createNewGame('daily'));
              return;
            }
          }
          
          // Validate the loaded state
          if (parsedState.tiles.length === 16) {
            // If we had a completed game, reset win animation state on reload
            if (parsedState.isComplete) {
              parsedState.winAnimationComplete = false;
            }
            setGameState(parsedState);
            return;
          }
        }
      } catch (error) {
        console.error('Error accessing localStorage:', error);
      }
    }
    
    // Create a new game if no saved state exists
    setGameState(createNewGame(mode));
  }, [gameState.gameMode]);

  // Handle tile clicks with multi-tile move support
  const handleTileClick = useCallback((position: number) => {
    setGameState(prevState => {
      // Don't allow moves if the game is already complete or paused
      if (prevState.isComplete || prevState.isPaused) {
        return prevState;
      }

      // Check if the clicked tile is in the same row or column as the empty space
      const clickedRow = Math.floor(position / 4);
      const clickedCol = position % 4;
      const emptyRow = Math.floor(prevState.emptyTilePosition / 4);
      const emptyCol = prevState.emptyTilePosition % 4;

      const isInSameRow = clickedRow === emptyRow;
      const isInSameCol = clickedCol === emptyCol;

      // If not in the same row or column, check if it's a direct adjacent move
      if (!isInSameRow && !isInSameCol) {
        // If it's not a valid direct move, ignore
        if (!isValidMove(position, prevState.emptyTilePosition)) {
          return prevState;
        }
      }

      // If this is the first move, set the start time
      const now = Date.now();
      const startTime = prevState.startTime || now;

      // Create a copy of the tiles array to modify
      let updatedTiles = [...prevState.tiles];
      
      // Handle row movement
      if (isInSameRow) {
        // Determine move direction
        const moveRight = position < prevState.emptyTilePosition;
                
        // Move all tiles in this range
        if (moveRight) {
          // Moving tiles right (empty moves left)
          for (let col = emptyCol - 1; col >= clickedCol; col--) {
            const currentPos = clickedRow * 4 + col;
            const targetPos = currentPos + 1;
            
            // Find and move each tile
            const tile = updatedTiles.find(t => t.position === currentPos);
            if (tile) {
              updatedTiles = updatedTiles.map(t => 
                t.position === currentPos ? {...t, position: targetPos} : t
              );
            }
          }
        } else {
          // Moving tiles left (empty moves right)
          for (let col = emptyCol + 1; col <= clickedCol; col++) {
            const currentPos = clickedRow * 4 + col;
            const targetPos = currentPos - 1;
            
            // Find and move each tile
            const tile = updatedTiles.find(t => t.position === currentPos);
            if (tile) {
              updatedTiles = updatedTiles.map(t => 
                t.position === currentPos ? {...t, position: targetPos} : t
              );
            }
          }
        }
      }
      // Handle column movement
      else if (isInSameCol) {
        // Determine move direction
        const moveDown = position < prevState.emptyTilePosition;
        
        // Move all tiles in this range
        if (moveDown) {
          // Moving tiles down (empty moves up)
          for (let row = emptyRow - 1; row >= clickedRow; row--) {
            const currentPos = row * 4 + clickedCol;
            const targetPos = currentPos + 4;
            
            // Find and move each tile
            const tile = updatedTiles.find(t => t.position === currentPos);
            if (tile) {
              updatedTiles = updatedTiles.map(t => 
                t.position === currentPos ? {...t, position: targetPos} : t
              );
            }
          }
        } else {
          // Moving tiles up (empty moves down)
          for (let row = emptyRow + 1; row <= clickedRow; row++) {
            const currentPos = row * 4 + clickedCol;
            const targetPos = currentPos - 4;
            
            // Find and move each tile
            const tile = updatedTiles.find(t => t.position === currentPos);
            if (tile) {
              updatedTiles = updatedTiles.map(t => 
                t.position === currentPos ? {...t, position: targetPos} : t
              );
            }
          }
        }
      }
      // Direct adjacent move
      else {
        // Just swap the clicked tile with the empty space
        updatedTiles = updatedTiles.map(tile => {
          if (tile.position === position) {
            return {...tile, position: prevState.emptyTilePosition};
          }
          if (tile.position === prevState.emptyTilePosition) {
            return {...tile, position};
          }
          return tile;
        });
      }
      
      // Move the empty tile to the clicked position
      updatedTiles = updatedTiles.map(tile => 
        tile.value === 0 ? {...tile, position: position} : tile
      );
      
      // Check if the puzzle is complete after this move
      const isComplete = isPuzzleComplete(updatedTiles);
      const endTime = isComplete ? now : null;

      return {
        ...prevState,
        tiles: updatedTiles,
        emptyTilePosition: position,
        moves: prevState.moves + 1, // Count as a single move regardless of how many tiles moved
        startTime,
        endTime,
        isComplete,
        // Reset win animation state when we complete the puzzle
        winAnimationComplete: false
      };
    });
  }, []);

  // Reset the game with the current mode
  const resetGame = useCallback(() => {
    setGameState(createNewGame(gameState.gameMode));
  }, [gameState.gameMode]);

  // Check if the daily puzzle has been completed today
  const hasDailyBeenCompleted = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    
    try {
      const savedState = localStorage.getItem(STORAGE_KEY_DAILY);
      const playedDate = localStorage.getItem(STORAGE_KEY_PLAYED_DATE);
      
      if (!savedState || !playedDate) return false;
      
      const state = JSON.parse(savedState) as GameState;
      return playedDate === getCurrentDate() && state.isComplete;
    } catch (error) {
      console.error('Error checking daily completion:', error);
      return false;
    }
  }, []);

  return {
    gameState,
    handleTileClick,
    resetGame,
    changeGameMode,
    hasDailyBeenCompleted,
    togglePause,
    handleWinAnimationComplete
  };
};