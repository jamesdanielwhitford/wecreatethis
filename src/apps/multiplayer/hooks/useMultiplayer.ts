// src/apps/multiplayer/hooks/useMultiplayer.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { Room, Player, ConnectionStatus, LobbyState } from '../types/lobby.types';
import { MultiplayerService } from '../utils/supabase';

export const useMultiplayer = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [lobbyState, setLobbyState] = useState<LobbyState>('finding-match');
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const multiplayerService = useRef(MultiplayerService.getInstance());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subscriptionRef = useRef<any>(null);

  // Clean up subscription on unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  // Subscribe to room updates
  const subscribeToRoom = useCallback((roomId: string) => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    setConnectionStatus('connecting');
    
    subscriptionRef.current = multiplayerService.current.subscribeToRoom(
      roomId,
      (room) => {
        if (room) {
          setCurrentRoom(room);
          setConnectionStatus('connected');
          
          // Update lobby state based on room status
          if (room.status === 'waiting') {
            setLobbyState('in-room');
          } else if (room.status === 'ready') {
            setLobbyState('game-selection');
          } else if (room.status === 'in-game') {
            setLobbyState('in-game');
          }

          // Update current player info
          const playerId = multiplayerService.current.getCurrentPlayerId();
          if (playerId) {
            const player = room.players.find(p => p.id === playerId);
            if (player) {
              setCurrentPlayer(player);
            }
          }
        } else {
          // Room was deleted
          setCurrentRoom(null);
          setCurrentPlayer(null);
          setLobbyState('finding-match');
          setConnectionStatus('disconnected');
        }
      }
    );
  }, []);

  // Create a new room
  const createRoom = useCallback(async (playerName: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { roomId, playerId } = await multiplayerService.current.createRoom(playerName, 'private');
      
      // Immediately set the room state - don't wait for subscription
      const newPlayer: Player = {
        id: playerId,
        name: playerName,
        isReady: false,
        joinedAt: new Date().toISOString(),
      };
      
      const newRoom: Room = {
        id: roomId,
        hostId: playerId,
        players: [newPlayer],
        maxPlayers: 2,
        status: 'waiting',
        type: 'private',
        selectedGame: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      setCurrentRoom(newRoom);
      setCurrentPlayer(newPlayer);
      setLobbyState('in-room');
      setConnectionStatus('connected');
      
      // Now subscribe for future updates
      subscribeToRoom(roomId);
      
      return { roomId, playerId };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create room';
      setError(errorMessage);
      setConnectionStatus('error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [subscribeToRoom]);

  // Join an existing room
  const joinRoom = useCallback(async (roomId: string, playerName: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { playerId } = await multiplayerService.current.joinRoom(roomId, playerName);
      
      // Set current player info immediately
      const newPlayer: Player = {
        id: playerId,
        name: playerName,
        isReady: false,
        joinedAt: new Date().toISOString(),
      };
      
      setCurrentPlayer(newPlayer);
      setLobbyState('in-room');
      setConnectionStatus('connecting');
      
      // Subscribe to get the full room state
      subscribeToRoom(roomId);
      
      return { playerId };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join room';
      setError(errorMessage);
      setConnectionStatus('error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [subscribeToRoom]);

  // Quick match
  const quickMatch = useCallback(async (playerName: string) => {
    setIsLoading(true);
    setError(null);
    setLobbyState('finding-match');
    
    try {
      const { roomId, playerId, isHost } = await multiplayerService.current.quickMatch(playerName);
      
      if (isHost) {
        // If we're the host, we created a new public room
        const newPlayer: Player = {
          id: playerId,
          name: playerName,
          isReady: false,
          joinedAt: new Date().toISOString(),
        };
        
        const newRoom: Room = {
          id: roomId,
          hostId: playerId,
          players: [newPlayer],
          maxPlayers: 2,
          status: 'waiting',
          type: 'public',
          selectedGame: undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        setCurrentRoom(newRoom);
        setCurrentPlayer(newPlayer);
        setConnectionStatus('connected');
      }
      
      setLobbyState('in-room');
      subscribeToRoom(roomId);
      
      return { roomId, playerId, isHost };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to find match';
      setError(errorMessage);
      setConnectionStatus('error');
      setLobbyState('finding-match');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [subscribeToRoom]);

  // Update player ready status
  const updateReady = useCallback(async (isReady: boolean) => {
    if (!currentRoom || !currentPlayer) return;
    
    try {
      await multiplayerService.current.updatePlayerReady(
        currentRoom.id,
        currentPlayer.id,
        isReady
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update ready status';
      setError(errorMessage);
    }
  }, [currentRoom, currentPlayer]);

  // Select a game
  const selectGame = useCallback(async (gameId: string) => {
    if (!currentRoom) return;
    
    try {
      await multiplayerService.current.selectGame(currentRoom.id, gameId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to select game';
      setError(errorMessage);
    }
  }, [currentRoom]);

  // Leave the current room
  const leaveRoom = useCallback(async () => {
    if (!currentRoom || !currentPlayer) return;
    
    try {
      await multiplayerService.current.leaveRoom(currentRoom.id, currentPlayer.id);
      
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      
      setCurrentRoom(null);
      setCurrentPlayer(null);
      setLobbyState('finding-match');
      setConnectionStatus('disconnected');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to leave room';
      setError(errorMessage);
    }
  }, [currentRoom, currentPlayer]);

  // Get current player info
  const isHost = currentRoom && currentPlayer ? currentRoom.hostId === currentPlayer.id : false;
  const isReady = currentPlayer?.isReady || false;
  const allPlayersReady = currentRoom ? currentRoom.players.every(p => p.isReady) : false;
  const roomFull = currentRoom ? currentRoom.players.length >= currentRoom.maxPlayers : false;

  return {
    // State
    connectionStatus,
    lobbyState,
    currentRoom,
    currentPlayer,
    error,
    isLoading,
    
    // Computed values
    isHost,
    isReady,
    allPlayersReady,
    roomFull,
    
    // Actions
    createRoom,
    joinRoom,
    quickMatch,
    updateReady,
    selectGame,
    leaveRoom,
    
    // Utilities
    clearError: () => setError(null),
  };
};