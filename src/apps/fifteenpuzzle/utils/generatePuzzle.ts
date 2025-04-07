// src/apps/fifteenpuzzle/utils/generatePuzzle.ts

import { Tile } from "../types/game.types";

// The two possible solved states
const SOLVED_STATE_1 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]; // Empty first
const SOLVED_STATE_2 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0]; // Empty last

// Fisher-Yates shuffle algorithm
const shuffleArray = (array: number[], seed: string): number[] => {
  const rng = seedRandom(seed);
  const result = [...array];
  
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  
  return result;
};

// Simple seeded random number generator
function seedRandom(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return function() {
    hash = (hash * 9301 + 49297) % 233280;
    return hash / 233280;
  };
}

// Check if a puzzle is in either of the solved states
const isAlreadySolved = (tiles: number[]): boolean => {
  // Check if it matches either solved state exactly
  const matchesFirst = tiles.every((val, idx) => val === SOLVED_STATE_1[idx]);
  const matchesSecond = tiles.every((val, idx) => val === SOLVED_STATE_2[idx]);
  
  return matchesFirst || matchesSecond;
};

// Check if a puzzle is solvable
export const isSolvable = (tiles: number[]): boolean => {
  // For a 4x4 puzzle, a puzzle is solvable if:
  // 1. If the empty tile is on an even row counting from the bottom and the number of inversions is odd
  // 2. If the empty tile is on an odd row counting from the bottom and the number of inversions is even
  
  // Find the empty tile position (0)
  const emptyTilePos = tiles.indexOf(0);
  
  // Calculate the row of the empty tile (counting from the bottom)
  const emptyRow = 4 - Math.floor(emptyTilePos / 4);
  
  // Count inversions
  let inversions = 0;
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i] === 0) continue;
    
    for (let j = i + 1; j < tiles.length; j++) {
      if (tiles[j] === 0) continue;
      if (tiles[i] > tiles[j]) {
        inversions++;
      }
    }
  }
  
  if (emptyRow % 2 === 0) {
    return inversions % 2 === 1;
  } else {
    return inversions % 2 === 0;
  }
};

// Create a predefined set of known good starting positions
// Each of these is solvable but requires multiple moves
const PREDEFINED_PUZZLES = [
  [1, 2, 3, 4, 5, 6, 0, 8, 9, 10, 7, 11, 13, 14, 15, 12],
  [1, 2, 3, 0, 5, 6, 7, 4, 9, 10, 11, 8, 13, 14, 15, 12],
  [1, 3, 0, 4, 5, 2, 7, 8, 9, 6, 11, 12, 13, 10, 14, 15],
  [0, 2, 3, 4, 1, 6, 7, 8, 5, 10, 11, 12, 9, 13, 14, 15]
];

// Generate a solvable puzzle that is not already solved
export const generateSolvablePuzzle = (seed: string): Tile[] => {
  // First, try to generate a random solvable puzzle
  const numbers = Array.from({ length: 16 }, (_, i) => i);
  
  let shuffled: number[] = [];
  let attempts = 0;
  const maxAttempts = 50; // Limit attempts to avoid infinite loops
  
  do {
    // Add the attempt number to the seed for variation
    shuffled = shuffleArray(numbers, seed + attempts.toString());
    attempts++;
    
    // Break after max attempts to avoid infinite loop
    if (attempts >= maxAttempts) {
      console.warn(`Hit max attempts (${maxAttempts}) trying to generate a valid puzzle.`);
      
      // Use a predefined puzzle based on the seed
      const seedNumber = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const puzzleIndex = seedNumber % PREDEFINED_PUZZLES.length;
      shuffled = [...PREDEFINED_PUZZLES[puzzleIndex]];
      break;
    }
  } while (!isSolvable(shuffled) || isAlreadySolved(shuffled));
  
  // If we somehow still ended up with a solved puzzle, force a swap
  if (isAlreadySolved(shuffled)) {
    console.warn("Generated a solved puzzle despite checks! Forcing a non-solved state.");
    // Swap some positions to make it unsolved but still solvable
    [shuffled[13], shuffled[14]] = [shuffled[14], shuffled[13]];
    
    // If that made it unsolvable, swap another pair to restore solvability
    if (!isSolvable(shuffled)) {
      [shuffled[11], shuffled[12]] = [shuffled[12], shuffled[11]];
    }
  }
  
  // Create tiles with positions
  return shuffled.map((value, position) => ({ value, position }));
};

// Check if the puzzle is complete
export const isPuzzleComplete = (tiles: Tile[]): boolean => {
  // Check if tiles are in order (either starting or ending with empty)
  const values = tiles.map(tile => tile.value);
  
  // Check if it starts with empty (0) and then 1-15 in order
  const startsWithEmpty = values[0] === 0 && 
    values.slice(1).every((val, idx) => val === idx + 1);
  
  // Check if it ends with empty (0) and 1-15 in order
  const endsWithEmpty = values[15] === 0 && 
    values.slice(0, 15).every((val, idx) => val === idx + 1);
  
  return startsWithEmpty || endsWithEmpty;
};

// Generate a daily seed based on the date
export const getDailySeed = (): string => {
  const date = new Date();
  return `fifteenpuzzle-${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
};

// Format time in minutes and seconds
export const formatTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Prepare share text
export const prepareShareText = (time: number, moves: number, date: string): string => {
  return `I solved the 15-Puzzle for ${date} in ${formatTime(time)} with ${moves} moves! Try it at wecreatethis.com/15puzzle`;
};

// Get current date in YYYY-MM-DD format
export const getCurrentDate = (): string => {
  const date = new Date();
  return date.toISOString().split('T')[0];
};

// Check if a move is valid (tile is adjacent to empty space)
export const isValidMove = (tilePosition: number, emptyPosition: number): boolean => {
  // On a 4x4 grid, valid moves are tiles that are
  // directly above, below, left, or right of the empty space
  
  const tileRow = Math.floor(tilePosition / 4);
  const tileCol = tilePosition % 4;
  
  const emptyRow = Math.floor(emptyPosition / 4);
  const emptyCol = emptyPosition % 4;
  
  // Check if the tile is adjacent to the empty space
  return (
    (Math.abs(tileRow - emptyRow) === 1 && tileCol === emptyCol) ||
    (Math.abs(tileCol - emptyCol) === 1 && tileRow === emptyRow)
  );
};