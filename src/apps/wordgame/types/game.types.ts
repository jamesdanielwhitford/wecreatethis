// Base game types
export type GameColor = '' | 'orange' | 'red' | 'green';
export type TileMark = 'red-mark' | 'green-mark';
export type TileDot = 'red-dot' | 'green-dot';

export interface TileState {
  color: GameColor;
  mark?: TileMark;
  dot?: TileDot;
  letter: string;
}

// Component Props
export interface WordGameProps {
  gameWord: string;
  onNewGame?: () => void;
  gameTitle: string;
  alternateGamePath: string;
  alternateGameName: string;
  isDaily?: boolean;
  validGuesses: string[];
  cacheKey: string;
}

export interface BoardProps {
  tileStates: TileState[][];
  currentGuess: string;
  guessesRemaining: number;
  guessHistory: string[];
  gameWord: string;
  isHardMode: boolean;
  onTileMark: (rowIndex: number, colIndex: number) => void;
}

export interface KeyboardProps {
  onKeyPress: (key: string) => void;
  keyboardColors: Record<string, GameColor>;
  isGameOver: boolean;
}

export interface KeyboardButtonProps {
  dataKey: string;
  onClick: (key: string) => void;
  className?: string;
  children: React.ReactNode;
}

export interface EndGameModalProps {
  show: boolean;
  onClose: () => void;
  gameWon: boolean;
  gameWord: string;
  finalAttempts: number;
  isDaily?: boolean; 
  onPlayAgain: () => void;
  alternateGamePath: string;
  alternateGameName: string;
  onShare: () => void;
}

export interface GameModeSwitcherProps {
  isHardMode: boolean;
  onModeChange: () => void;
  hasStartedGame: boolean;
}

// Game State
export interface GameState {
  currentGuess: string;
  isHardMode: boolean;
  tileStates: TileState[][];
  guessesRemaining: number;
  guessHistory: string[];
  gameOver: boolean;
  gameWon: boolean;
  finalAttempts: number;
  keyboardColors: Record<string, GameColor>;
  showEndModal: boolean;
  knownCorrectLetters: Map<string, number>;
  knownIncorrectLetters: Set<string>;
  knownMaxFrequency: Map<string, number>;
}

// Cache Types
export interface CachedGameState extends Omit<GameState, 'knownCorrectLetters' | 'knownIncorrectLetters' | 'knownMaxFrequency'> {
  version: string;
  word: string;
  isHardMode: boolean;
  knownCorrectLetters: [string, number][];
  knownIncorrectLetters: string[];
  knownMaxFrequency: [string, number][];
}

// Utility Types
export interface GuessState {
  knownCorrectLetters: Map<string, number>;
  knownIncorrectLetters: Set<string>;
  knownMaxFrequency: Map<string, number>;
  tileStates: TileState[][];
  keyboardColors: Record<string, GameColor>;
}

// Hook Props Types
export interface UseGameStateProps {
  gameWord: string;
  cacheKey: string;
  validGuesses: string[];
  onNewGame?: () => void;
}

export interface UseKeyboardHandlingProps {
  onInput: (key: string) => void;
  gameOver: boolean;
  currentGuess: string;
  onSubmit: () => void;
}