// src/apps/picturepuzzle/hooks/useGameState.ts

import { useState, useEffect, useCallback } from 'react';
import { GameState, GameMode } from '../types/games.types';
import { 
  generateSolvablePuzzleByShufflingBlank, 
  isPuzzleComplete, 
  isValidMove, 
  getDailySeed,
  getCurrentDate
} from '../utils/generatePuzzle';
import { getAllImages } from '../components/ImageSelect';

const STORAGE_KEY_DAILY = 'picturepuzzle-daily-state';
const STORAGE_KEY_INFINITE = 'picturepuzzle-infinite-state';
const STORAGE_KEY_PLAYED_DATE = 'picturepuzzle-played-date';

// Helper to get a daily image based on the date
const getDailyImage = (): string => {
  const availableImages = getAllImages();
  if (availableImages.length === 0) return '';
  
  const date = new Date();
  // Fix: Use proper date difference calculation for TypeScript
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  // Use the day of year to pick an image, wrapping around if needed
  return availableImages[dayOfYear % availableImages.length];
};

// Helper to get a random image for infinite mode
const getRandomImage = (excludedImage?: string): string => {
  const availableImages = getAllImages();
  if (availableImages.length === 0) return '';
  if (availableImages.length === 1) return availableImages[0];
  
  // If we need to exclude an image (e.g., current image), filter it out
  const filteredImages = excludedImage 
    ? availableImages.filter(img => img !== excludedImage) 
    : availableImages;
  
  // Pick a random image from the available ones
  const randomIndex = Math.floor(Math.random() * filteredImages.length);
  return filteredImages[randomIndex];
};

// Create a new game state with the specified mode
const createNewGame = (mode: GameMode, currentImageSrc?: string): GameState => {
  const date = getCurrentDate();
  const seed = mode === 'daily' ? getDailySeed() : `${mode}-${Date.now()}-${Math.random()}`;
  
  // Determine which image to use
  let imageSrc = '';
  if (mode === 'daily') {
    imageSrc = getDailyImage();
  } else {
    // For infinite mode, use a random image or the specified current image
    imageSrc = currentImageSrc || getRandomImage();
  }
  
  // Generate the tile arrangement, passing the game mode
  const tiles = generateSolvablePuzzleByShufflingBlank(seed, 500);
  
  // Find the empty tile position
  const emptyTile = tiles.find(tile => tile.value === 0);
  const emptyTilePosition = emptyTile ? emptyTile.position : 0;
  
  // Assume a standard 400x400 image initially (will be adjusted when loaded)
  const imageWidth = 400;
  const imageHeight = 400;
  
  return {
    tiles: tiles,
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
    winAnimationComplete: false,
    imageSrc,
    imageWidth,
    imageHeight
  };
};

export const useGameState = (initialMode: GameMode = 'daily') => {
  // Get initial state (from localStorage or create new)
  const getInitialState = (): GameState => {
    if (typeof window !== 'undefined') {
      try {
        let storageKey;
        if (initialMode === 'daily') storageKey = STORAGE_KEY_DAILY;
        else storageKey = STORAGE_KEY_INFINITE;
        
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
          
          // If we have a valid saved state, use it
          if (parsedState.tiles.length === 16) {
            // Reset win animation state if the game was completed
            if (parsedState.isComplete) {
              parsedState.winAnimationComplete = false;
            }
            
            // Check if the image still exists in our categories
            const allImages = getAllImages();
            if (!allImages.includes(parsedState.imageSrc)) {
              // Image no longer exists, create a new game with a valid image
              return createNewGame(initialMode);
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
        let storageKey;
        if (gameState.gameMode === 'daily') storageKey = STORAGE_KEY_DAILY;
        else storageKey = STORAGE_KEY_INFINITE;
        
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
        let storageKey;
        if (mode === 'daily') storageKey = STORAGE_KEY_DAILY;
        else storageKey = STORAGE_KEY_INFINITE;
        
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
            // Reset win animation state if the game was completed
            if (parsedState.isComplete) {
              parsedState.winAnimationComplete = false;
            }
            
            // Check if the image still exists in our categories
            const allImages = getAllImages();
            if (!allImages.includes(parsedState.imageSrc)) {
              // Image no longer exists, create a new game with a valid image
              setGameState(createNewGame(mode));
              return;
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

  // Handle changing the image (for infinite mode)
  const changeImage = useCallback((imageSrc: string) => {
    setGameState(prevState => {
      // If the image hasn't changed, don't update
      if (prevState.imageSrc === imageSrc) {
        return prevState;
      }
      
      // Create a new game with the selected image
      return createNewGame(prevState.gameMode, imageSrc);
    });
  }, []);

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
        moves: prevState.moves + 1, // Count as a single move
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
    setGameState(prevState => 
      createNewGame(prevState.gameMode, prevState.imageSrc)
    );
  }, []);

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
    handleWinAnimationComplete,
    changeImage
  };
};