// src/apps/survivorpuzzle/types/game.types.ts
export type Difficulty = 'none' | 'easy' | 'medium' | 'difficult';

export interface GameState {
  rows: number[][];
  currentNumber: number | null;
  isComplete: boolean;
  startTime: number | null;
  isPaused: boolean;
  pausedTime: number;
  difficulty: Difficulty;
  timeLimit: number | null; // null for 'none' difficulty
  moves: number;
  isTimeout: boolean;
}

export interface TimerState {
  elapsedTime: number;
  isRunning: boolean;
  isCountUp: boolean; // Added for 'none' difficulty
}