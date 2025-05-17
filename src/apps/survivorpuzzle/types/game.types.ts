// src/apps/survivorpuzzle/types/game.types.ts (Updated)

export interface GameState {
  rows: number[][];
  currentNumber: number | null;
  isComplete: boolean;
  startTime: number | null;
  isPaused: boolean;
  pausedTime: number;
  moves: number;
  isTimeout: boolean;
}

export interface TimerState {
  elapsedTime: number;
  isRunning: boolean;
}