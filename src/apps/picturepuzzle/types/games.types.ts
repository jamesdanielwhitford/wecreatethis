// src/apps/picturepuzzle/types/games.types.ts

export type GameMode = 'daily' | 'infinite';

export interface Tile {
  value: number; // 0 represents the empty tile
  position: number; // Position in the grid (0-15)
  // These properties are used for rendering the image piece
  imageX?: number; // X-coordinate in the original image
  imageY?: number; // Y-coordinate in the original image
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
  isPaused: boolean;
  pausedTime: number;
  lastPausedAt: number | null;
  winAnimationComplete: boolean;
  // New properties for image puzzle
  imageSrc: string; // Path to the current image
  imageWidth: number; // Original image width
  imageHeight: number; // Original image height
}

export interface TimerState {
  isRunning: boolean;
  startTime: number | null;
  currentTime: number;
  elapsedTime: number;
  isPaused: boolean;
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
  imageSrc: string; // Path to the completed image
}

export interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface BoardProps {
  tiles: Tile[];
  onTileClick: (position: number) => void;
  isComplete: boolean;
  isPaused?: boolean;
  onWinAnimationComplete?: () => void;
  imageSrc: string; // Path to the image being used
  tileSize: number; // Size of each tile in pixels
  imageWidth?: number; // Original image width
  imageHeight?: number; // Original image height
}

export interface TimerProps {
  elapsedTime: number;
  isRunning: boolean;
  isPaused: boolean;
  onTimerClick: () => void;
}

export interface NavbarProps {
  gameMode: GameMode;
  onModeChange: (mode: GameMode) => void;
  onRulesClick: () => void;
}

// New interface for the preview modal
export interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  isImpossibleMode?: boolean;
}

// Interface for image selection (used in infinite mode)
export interface ImageSelectProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (imageSrc: string) => void;
  currentImage: string;
}