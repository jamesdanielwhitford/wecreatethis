// src/apps/multiplayer/utils/supabase.ts
import { createClient } from '@supabase/supabase-js';
// import { Room, Player, Connect4GameState, PostGameDecision } from '../types/lobby.types';
import { Room, Player, PostGameDecision } from '../types/lobby.types';


// Note: You'll need to set up these environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

export class MultiplayerService {
  private static instance: MultiplayerService;
  private currentRoomId: string | null = null;
  private currentPlayerId: string | null = null;

  static getInstance(): MultiplayerService {
    if (!MultiplayerService.instance) {
      MultiplayerService.instance = new MultiplayerService();
    }
    return MultiplayerService.instance;
  }

  // Generate a unique room ID
  private generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  // Generate a unique player ID
  private generatePlayerId(): string {
    return 'player_' + Math.random().toString(36).substring(2, 15);
  }

  // Create a new room
  async createRoom(playerName: string, roomType: 'private' | 'public' = 'private'): Promise<{ roomId: string; playerId: string }> {
    const roomId = this.generateRoomId();
    const playerId = this.generatePlayerId();
    
    const player: Player = {
      id: playerId,
      name: playerName,
      isReady: false,
      joinedAt: new Date().toISOString(),
    };

    const roomData = {
      id: roomId,
      host_id: playerId,
      players: [player],
      max_players: 2,
      status: 'waiting',
      type: roomType,
      game_state: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('multiplayer_rooms')
      .insert([roomData]);

    if (error) {
      throw new Error('Failed to create room: ' + error.message);
    }

    this.currentRoomId = roomId;
    this.currentPlayerId = playerId;

    return { roomId, playerId };
  }

  // Join an existing room
  async joinRoom(roomId: string, playerName: string): Promise<{ playerId: string }> {
    const playerId = this.generatePlayerId();

    // First, get the current room state
    const { data: roomData, error: fetchError } = await supabase
      .from('multiplayer_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (fetchError || !roomData) {
      throw new Error('Room not found');
    }

    // Convert snake_case to camelCase for TypeScript
    const room: Room = {
      id: roomData.id,
      hostId: roomData.host_id,
      players: roomData.players,
      maxPlayers: roomData.max_players,
      status: roomData.status,
      type: roomData.type,
      selectedGame: roomData.selected_game,
      gameState: roomData.game_state,
      createdAt: roomData.created_at,
      updatedAt: roomData.updated_at,
    };

    if (room.players.length >= room.maxPlayers) {
      throw new Error('Room is full');
    }

    if (room.status !== 'waiting') {
      throw new Error('Room is not accepting new players');
    }

    const newPlayer: Player = {
      id: playerId,
      name: playerName,
      isReady: false,
      joinedAt: new Date().toISOString(),
    };

    const updatedPlayers = [...room.players, newPlayer];

    const { error } = await supabase
      .from('multiplayer_rooms')
      .update({
        players: updatedPlayers,
        updated_at: new Date().toISOString(),
      })
      .eq('id', roomId);

    if (error) {
      throw new Error('Failed to join room: ' + error.message);
    }

    this.currentRoomId = roomId;
    this.currentPlayerId = playerId;

    return { playerId };
  }

  // Update player ready status
  async updatePlayerReady(roomId: string, playerId: string, isReady: boolean): Promise<void> {
    const { data: roomData, error: fetchError } = await supabase
      .from('multiplayer_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (fetchError || !roomData) {
      throw new Error('Room not found');
    }

    // Convert to TypeScript format
    const room: Room = {
      id: roomData.id,
      hostId: roomData.host_id,
      players: roomData.players,
      maxPlayers: roomData.max_players,
      status: roomData.status,
      type: roomData.type,
      selectedGame: roomData.selected_game,
      gameState: roomData.game_state,
      createdAt: roomData.created_at,
      updatedAt: roomData.updated_at,
    };

    const updatedPlayers = room.players.map(player =>
      player.id === playerId ? { ...player, isReady } : player
    );

    // Check if all players are ready
    const allReady = updatedPlayers.every(player => player.isReady);
    const newStatus = allReady && updatedPlayers.length === room.maxPlayers ? 'ready' : room.status;

    const { error } = await supabase
      .from('multiplayer_rooms')
      .update({
        players: updatedPlayers,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', roomId);

    if (error) {
      throw new Error('Failed to update player status: ' + error.message);
    }
  }

  // Select a game for the room
  async selectGame(roomId: string, gameId: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (gameId) {
      updateData.selected_game = gameId;
      updateData.status = 'in-game';
    } else {
      // Clearing the game selection, go back to ready state for game selection
      updateData.selected_game = null;
      updateData.status = 'ready'; // Changed from 'game-selection' to 'ready'
      updateData.game_state = null;
    }

    const { error } = await supabase
      .from('multiplayer_rooms')
      .update(updateData)
      .eq('id', roomId);

    if (error) {
      throw new Error('Failed to select game: ' + error.message);
    }
  }

  // Update game state (for Connect 4 and other games)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async updateGameState(roomId: string, gameState: any): Promise<void> {
    const { error } = await supabase
      .from('multiplayer_rooms')
      .update({
        game_state: gameState,
        updated_at: new Date().toISOString(),
      })
      .eq('id', roomId);

    if (error) {
      throw new Error('Failed to update game state: ' + error.message);
    }
  }

  // Update post-game decisions
  async updatePostGameDecisions(roomId: string, decisions: PostGameDecision[]): Promise<void> {
    // Get current game state and update it with decisions
    const { data: roomData, error: fetchError } = await supabase
      .from('multiplayer_rooms')
      .select('game_state')
      .eq('id', roomId)
      .single();

    if (fetchError || !roomData) {
      throw new Error('Room not found');
    }

    const updatedGameState = {
      ...roomData.game_state,
      postGameDecisions: decisions
    };

    const { error } = await supabase
      .from('multiplayer_rooms')
      .update({
        game_state: updatedGameState,
        updated_at: new Date().toISOString(),
      })
      .eq('id', roomId);

    if (error) {
      throw new Error('Failed to update post-game decisions: ' + error.message);
    }
  }

  // Leave a room
  async leaveRoom(roomId: string, playerId: string): Promise<void> {
    const { data: roomData, error: fetchError } = await supabase
      .from('multiplayer_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (fetchError || !roomData) {
      return; // Room doesn't exist, nothing to do
    }

    // Convert to TypeScript format
    const room: Room = {
      id: roomData.id,
      hostId: roomData.host_id,
      players: roomData.players,
      maxPlayers: roomData.max_players,
      status: roomData.status,
      type: roomData.type,
      selectedGame: roomData.selected_game,
      gameState: roomData.game_state,
      createdAt: roomData.created_at,
      updatedAt: roomData.updated_at,
    };

    const updatedPlayers = room.players.filter(player => player.id !== playerId);

    if (updatedPlayers.length === 0) {
      // Delete the room if no players left
      await supabase
        .from('multiplayer_rooms')
        .delete()
        .eq('id', roomId);
    } else {
      // Update the room with remaining players
      // If the host left, make the first remaining player the new host
      const newHostId = room.hostId === playerId ? updatedPlayers[0].id : room.hostId;

      await supabase
        .from('multiplayer_rooms')
        .update({
          host_id: newHostId,
          players: updatedPlayers,
          updated_at: new Date().toISOString(),
        })
        .eq('id', roomId);
    }

    if (this.currentRoomId === roomId && this.currentPlayerId === playerId) {
      this.currentRoomId = null;
      this.currentPlayerId = null;
    }
  }

  // Subscribe to room changes
  subscribeToRoom(roomId: string, callback: (room: Room | null) => void) {
    return supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'multiplayer_rooms',
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            callback(null);
          } else {
            // Convert snake_case to camelCase
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const roomData = payload.new as any;
            const room: Room = {
              id: roomData.id,
              hostId: roomData.host_id,
              players: roomData.players,
              maxPlayers: roomData.max_players,
              status: roomData.status,
              type: roomData.type,
              selectedGame: roomData.selected_game,
              gameState: roomData.game_state,
              createdAt: roomData.created_at,
              updatedAt: roomData.updated_at,
            };
            callback(room);
          }
        }
      )
      .subscribe();
  }

  // Quick match - find an available room or create one
  async quickMatch(playerName: string): Promise<{ roomId: string; playerId: string; isHost: boolean }> {
    // First, try to find an available PUBLIC room (not private rooms)
    const { data: availableRooms, error } = await supabase
      .from('multiplayer_rooms')
      .select('*')
      .eq('status', 'waiting')
      .eq('type', 'public') // Only search for public rooms
      .order('created_at', { ascending: true })
      .limit(10);

    if (error) {
      throw new Error('Failed to search for rooms: ' + error.message);
    }

    if (availableRooms && availableRooms.length > 0) {
      // Find a room that has space (check players array length)
      for (const roomData of availableRooms) {
        const playersCount = Array.isArray(roomData.players) ? roomData.players.length : 0;
        if (playersCount < roomData.max_players) {
          // Join this room
          const { playerId } = await this.joinRoom(roomData.id, playerName);
          return { roomId: roomData.id, playerId, isHost: false };
        }
      }
    }

    // No available public rooms found, create a new PUBLIC room
    const { roomId, playerId } = await this.createRoom(playerName, 'public');
    return { roomId, playerId, isHost: true };
  }

  getCurrentRoomId(): string | null {
    return this.currentRoomId;
  }

  getCurrentPlayerId(): string | null {
    return this.currentPlayerId;
  }
}