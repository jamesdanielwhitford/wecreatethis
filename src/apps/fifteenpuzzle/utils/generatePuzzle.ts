// src/apps/fifteenpuzzle/utils/generatePuzzle.ts

import { Tile } from "../types/game.types";

// Fisher-Yates shuffle algorithm with better seeded random
const shuffleArray = (array: number[], seed: string): number[] => {
  const rng = seedRandom(seed);
  const result = [...array];
  
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  
  return result;
};

// Better seeded random number generator for consistency
function seedRandom(seed: string) {
  // Create a more robust seed hash
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  
  const m = 2**35 - 31; // A large prime number
  const a = 185852;     // Multiplier
  const c = 1;          // Increment
  
  let state = hash % m;
  
  return function() {
    state = (a * state + c) % m;
    return state / m;
  };
}

// Check if a puzzle is solvable
export const isSolvable = (tiles: number[]): boolean => {
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
  
  // Find the empty tile row (counting from the bottom, 0-indexed)
  const emptyTileIndex = tiles.indexOf(0);
  const emptyTileRow = 3 - Math.floor(emptyTileIndex / 4);
  
  // For a 4x4 puzzle:
  // If the empty tile is on an even row (from bottom), 
  // the number of inversions must be odd for the puzzle to be solvable.
  // If the empty tile is on an odd row (from bottom),
  // the number of inversions must be even for the puzzle to be solvable.
  return (emptyTileRow % 2 === 0) ? (inversions % 2 === 1) : (inversions % 2 === 0);
};

// Generate a solvable puzzle
export const generateSolvablePuzzle = (seed: string): Tile[] => {
  // Create array 0-15 representing the tiles (where 0 is the empty space)
  const numbers = Array.from({ length: 16 }, (_, i) => i);
  
  // Try up to 10 times to get a solvable puzzle
  let shuffled;
  let attempt = 0;
  
  do {
    shuffled = shuffleArray([...numbers], seed + attempt.toString());
    attempt++;
  } while (!isSolvable(shuffled) && attempt < 10);
  
  // If we couldn't generate a solvable puzzle after 10 attempts, use a known solvable one
  if (!isSolvable(shuffled)) {
    console.warn("Could not generate a solvable puzzle, using default arrangement");
    shuffled = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 0, 15]; // Known solvable
  }
  
  // Convert to Tile objects with positions
  // This is a crucial step - map each value to an object with position and value
  return shuffled.map((value, index) => ({
    value,
    position: index
  }));
};

// Check if the puzzle is complete
export const isPuzzleComplete = (tiles: Tile[]): boolean => {
  // Sort tiles by position
  const sortedTiles = [...tiles].sort((a, b) => a.position - b.position);
  const values = sortedTiles.map(tile => tile.value);
  
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