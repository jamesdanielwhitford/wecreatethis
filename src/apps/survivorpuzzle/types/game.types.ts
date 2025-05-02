export type Difficulty = 'easy' | 'medium' | 'difficult';

export interface GameState {
  rows: number[][];
  currentNumber: number | null;
  isComplete: boolean;
  startTime: number | null;
  isPaused: boolean;
  pausedTime: number;
  difficulty: Difficulty;
  timeLimit: number;
  moves: number;
  isTimeout: boolean;
}

export interface TimerState {
  elapsedTime: number;
  isRunning: boolean;
}