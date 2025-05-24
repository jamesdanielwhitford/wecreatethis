// src/apps/multiplayer/types/lobby.types.ts
export interface Player {
  id: string;
  name: string;
  avatar?: string;
  isReady: boolean;
  joinedAt: string;
}

export interface Room {
  id: string;
  hostId: string;
  players: Player[];
  maxPlayers: number;
  status: 'waiting' | 'ready' | 'in-game' | 'finished';
  type: 'private' | 'public'; // private = created via "Create Room", public = created via "Quick Match"
  selectedGame?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gameState?: any; // Game-specific state
  createdAt: string;
  updatedAt: string;
}

export interface GameOption {
  id: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  estimatedDuration: string;
  icon?: string;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export type LobbyState = 'finding-match' | 'creating-room' | 'joining-room' | 'in-room' | 'game-selection' | 'in-game';

// Connect 4 specific types
export type Connect4CellValue = 'empty' | 'player1' | 'player2';
export type Connect4Grid = Connect4CellValue[][];

export interface Connect4GameState {
  grid: Connect4Grid;
  currentPlayer: 'player1' | 'player2';
  gameStatus: 'playing' | 'won' | 'draw';
  winner?: 'player1' | 'player2';
  winningCells?: Array<{row: number, col: number}>;
  moveHistory: Array<{player: 'player1' | 'player2', column: number, row: number}>;
  player1Id: string;
  player2Id: string;
}

export interface PostGameDecision {
  playerId: string;
  decision: 'play-again' | 'choose-new-game' | 'leave';
}