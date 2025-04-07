// src/apps/fifteenpuzzle/utils/generatePuzzle.ts

import { Tile } from "../types/game.types";

// --- Constants ---
const N = 4; // Grid dimension
const BLANK_TILE = 0; // Value representing the blank tile
const GRID_SIZE = N * N;
// Standard solved state (empty last) used as the starting point for shuffling
const SOLVED_STATE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0];
// Define the two target solved states for checking completion
const SOLVED_STATE_TARGET_1 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]; // Empty first
const SOLVED_STATE_TARGET_2 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0]; // Empty last

// --- Seeded RNG (Keep as is) ---
function seedRandom(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  // Simple LCG: constants from Numerical Recipes
  return function() {
    hash = (hash * 1664525 + 1013904223) | 0; // Ensure 32bit integer arithmetic
    return (hash >>> 0) / 4294967296; // Convert to positive float [0, 1)
  };
}

// --- Helper Functions ---

// Check if a puzzle state array matches either target solved state
const isAlreadySolved = (tiles: number[]): boolean => {
  if (tiles.length !== GRID_SIZE) return false;
  const matchesFirst = tiles.every((val, idx) => val === SOLVED_STATE_TARGET_1[idx]);
  const matchesSecond = tiles.every((val, idx) => val === SOLVED_STATE_TARGET_2[idx]);
  return matchesFirst || matchesSecond;
};

// Function to get valid move target indices for the blank tile
const getValidBlankMoves = (emptyIndex: number): number[] => {
    const validTargetIndices: number[] = [];
    const emptyRow = Math.floor(emptyIndex / N);
    const emptyCol = emptyIndex % N;

    // Check move up (get index of tile above)
    if (emptyRow > 0) validTargetIndices.push(emptyIndex - N);
    // Check move down (get index of tile below)
    if (emptyRow < N - 1) validTargetIndices.push(emptyIndex + N);
    // Check move left (get index of tile left)
    if (emptyCol > 0) validTargetIndices.push(emptyIndex - 1);
    // Check move right (get index of tile right)
    if (emptyCol < N - 1) validTargetIndices.push(emptyIndex + 1);

    return validTargetIndices;
};

// --- New Puzzle Generation Method ---

/**
 * Generates a solvable puzzle by starting from the solved state
 * and performing a large number of random valid moves (shuffling the blank tile).
 * Guarantees solvability without needing an isSolvable check.
 *
 * @param seed A string seed for the random number generator for reproducibility.
 * @param shuffleMoves The number of random moves to perform. Default is 500.
 * @returns An array of Tile objects representing the generated puzzle state.
 */
export const generateSolvablePuzzleByShufflingBlank = (seed: string, shuffleMoves: number = 500): Tile[] => {
    console.log(`Generating puzzle with seed "${seed}" by shuffling blank ${shuffleMoves} times.`);
    const currentTiles = [...SOLVED_STATE]; // Start with a copy of the solved state
    let currentEmptyIndex = currentTiles.indexOf(BLANK_TILE); // Should be GRID_SIZE - 1 initially

    if (currentEmptyIndex === -1) {
        console.error("generateSolvablePuzzleByShufflingBlank: Could not find blank tile in initial state!");
        // Fallback to returning solved state tiles if something is fundamentally wrong
         return SOLVED_STATE.map((value, index) => ({
             value: value,
             position: index
         }));
    }

    const rng = seedRandom(seed); // Initialize seeded random number generator

    for (let i = 0; i < shuffleMoves; i++) {
        const possibleTargetIndices = getValidBlankMoves(currentEmptyIndex); // Gets adjacent INDICES
        if (possibleTargetIndices.length === 0) continue; // Should not happen in a connected 4x4 grid

        // Choose a random adjacent index using the seeded RNG
        const targetIndex = possibleTargetIndices[Math.floor(rng() * possibleTargetIndices.length)];

        // Swap the elements at the current empty index and the target index
        [currentTiles[currentEmptyIndex], currentTiles[targetIndex]] = [currentTiles[targetIndex], currentTiles[currentEmptyIndex]];

        // Update the index of the blank tile
        currentEmptyIndex = targetIndex;
    }

     // Check if it somehow ended up solved after shuffling (very unlikely but possible)
     if (isAlreadySolved(currentTiles)) {
          console.warn("Puzzle ended up in a solved state after shuffling, performing one extra forced move.");
          // Perform one more random valid swap if solved
          const possibleTargetIndices = getValidBlankMoves(currentEmptyIndex);
           if (possibleTargetIndices.length > 0) {
                // Use the RNG again to ensure deterministic final step if needed
                const targetIndex = possibleTargetIndices[Math.floor(rng() * possibleTargetIndices.length)];
               [currentTiles[currentEmptyIndex], currentTiles[targetIndex]] = [currentTiles[targetIndex], currentTiles[currentEmptyIndex]];
                currentEmptyIndex = targetIndex; // Update index just in case (though not strictly needed here)
           }
     }

    // Map the final tile values array to the Tile[] structure
    // The 'position' in the Tile object represents its current index in the flat array (0-15)
    return currentTiles.map((value, index) => ({
        value: value,
        position: index
    }));
};


// --- Utility functions (Keep the ones still needed) ---

// The old generateSolvablePuzzle and isSolvable are no longer needed.
// You can remove them or comment them out.
/*
// Fisher-Yates shuffle algorithm (No longer needed for generation)
const shuffleArray = (array: number[], seed: string): number[] => { ... };

// Check if a puzzle is solvable (No longer needed for generation)
export const isSolvable = (tiles: number[]): boolean => { ... };

// Generate a solvable puzzle that is not already solved (Old method - remove or comment out)
export const generateSolvablePuzzle = (seed: string): Tile[] => { ... };
*/


// Check if the puzzle is complete (based on the tile objects)
export const isPuzzleComplete = (tiles: Tile[]): boolean => {
  // Get the values in their current display order
  const currentValues = [...tiles]
      .sort((a, b) => a.position - b.position) // Sort by position index
      .map(tile => tile.value); // Get the values in order

  // Check if it matches either target solved state exactly
  const matchesFirst = currentValues.every((val, idx) => val === SOLVED_STATE_TARGET_1[idx]);
  const matchesSecond = currentValues.every((val, idx) => val === SOLVED_STATE_TARGET_2[idx]);

  return matchesFirst || matchesSecond;
};

// Generate a daily seed based on the date
export const getDailySeed = (): string => {
  const date = new Date();
  // Use UTC date to ensure consistency across time zones
  return `fifteenpuzzle-${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
};

// Format time in minutes and seconds
export const formatTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Prepare share text
export const prepareShareText = (time: number, moves: number): string => {
    // Use the current date for sharing, regardless of the puzzle date
    const shareDate = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format
    return `I solved the 15-Puzzle for ${shareDate} in ${formatTime(time)} with ${moves} moves! Try it at wecreatethis.com/15puzzle`;
    // Note: You might want the puzzle's date (gameState.date) instead of today's date here
    // return `I solved the 15-Puzzle (${date}) in ${formatTime(time)} with ${moves} moves! Try it at wecreatethis.com/15puzzle`;
};

// Get current date in YYYY-MM-DD format (UTC)
export const getCurrentDate = (): string => {
  const date = new Date();
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Check if a move is valid (tile's position is adjacent to empty tile's position)
export const isValidMove = (tilePosition: number, emptyPosition: number): boolean => {
  const tileRow = Math.floor(tilePosition / N);
  const tileCol = tilePosition % N;
  const emptyRow = Math.floor(emptyPosition / N);
  const emptyCol = emptyPosition % N;

  // Check Manhattan distance == 1
  return Math.abs(tileRow - emptyRow) + Math.abs(tileCol - emptyCol) === 1;
};