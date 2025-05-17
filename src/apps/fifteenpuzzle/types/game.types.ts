// src/apps/fifteenpuzzle/types/game.types.ts

export type GameMode = 'daily' | 'infinite';

export interface Tile {
  value: number; // 0 represents the empty tile
  position: number; // Position in the grid (0-15)
}

export interface GameState {
  tiles: Tile[];
  emptyTilePosition: number;
  moves: number;
  isComplete: boolean;
  startTime: number | null;
  endTime: number | null;
  gameMode: GameMode;
  seed: string;
  date: string;
  isPaused: boolean; // Kept for compatibility
  pausedTime: number; // Kept for compatibility
  lastPausedAt: number | null; // Kept for compatibility
  winAnimationComplete: boolean;
}

export interface TimerState {
  isRunning: boolean;
  elapsedTime: number;
}

export interface WinModalProps {
  isOpen: boolean;
  onClose: () => void;
  time: number;
  moves: number;
  date: string;
  onPlayInfinite: () => void;
  onShare: () => void;
  onNewGame?: () => void;
  gameMode: GameMode;
}

export interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface BoardProps {
  tiles: Tile[];
  onTileClick: (position: number) => void;
  isComplete: boolean;
  isPaused?: boolean; // Kept for compatibility but not used
  onWinAnimationComplete?: () => void;
}

export interface TimerProps {
  elapsedTime: number;
  isRunning: boolean;
}

export interface NavbarProps {
  gameMode: GameMode;
  onModeChange: (mode: GameMode) => void;
  onRulesClick: () => void;
}