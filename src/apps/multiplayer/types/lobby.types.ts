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