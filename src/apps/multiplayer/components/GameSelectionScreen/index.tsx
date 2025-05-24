// src/apps/multiplayer/components/GameSelectionScreen/index.tsx
'use client';

import { Room, Player, GameOption } from '../../types/lobby.types';
import styles from './styles.module.css';

interface GameSelectionScreenProps {
  room: Room | null;
  currentPlayer: Player | null;
  isHost: boolean;
  onSelectGame: (gameId: string) => void;
  onLeaveRoom: () => void;
}

// Mock game options - you can move this to a separate file later
const GAME_OPTIONS: GameOption[] = [
  {
    id: 'wordgame',
    name: 'Word Battle',
    description: 'Compete to guess words faster than your opponent',
    minPlayers: 2,
    maxPlayers: 2,
    estimatedDuration: '5-10 mins',
    icon: '📝',
  },
  {
    id: 'puzzle15',
    name: '15 Puzzle Race',
    description: 'Race to solve the sliding puzzle first',
    minPlayers: 2,
    maxPlayers: 2,
    estimatedDuration: '3-8 mins',
    icon: '🧩',
  },
  {
    id: 'picturepuzzle',
    name: 'Picture Puzzle Duel',
    description: 'Solve image puzzles head-to-head',
    minPlayers: 2,
    maxPlayers: 2,
    estimatedDuration: '5-12 mins',
    icon: '🖼️',
  },
  {
    id: 'trivia',
    name: 'Trivia Challenge',
    description: 'Test your knowledge against each other',
    minPlayers: 2,
    maxPlayers: 2,
    estimatedDuration: '8-15 mins',
    icon: '🧠',
  },
  {
    id: 'memory',
    name: 'Memory Match',
    description: 'Find matching pairs faster than your opponent',
    minPlayers: 2,
    maxPlayers: 2,
    estimatedDuration: '3-7 mins',
    icon: '🃏',
  },
  {
    id: 'chess',
    name: 'Quick Chess',
    description: 'Classic chess with faster time controls',
    minPlayers: 2,
    maxPlayers: 2,
    estimatedDuration: '10-20 mins',
    icon: '♟️',
  },
];

export const GameSelectionScreen = ({
  room,
  currentPlayer,
  isHost,
  onSelectGame,
  onLeaveRoom,
}: GameSelectionScreenProps) => {
  if (!room || !currentPlayer) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const handleGameSelect = (gameId: string) => {
    if (isHost) {
      onSelectGame(gameId);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Choose Your Game</h1>
        <div className={styles.roomInfo}>
          <span className={styles.roomCode}>Room: {room.id}</span>
          <button onClick={onLeaveRoom} className={styles.leaveButton}>
            🚪 Leave
          </button>
        </div>
      </div>

      <div className={styles.playersInfo}>
        <h3>Ready to Play:</h3>
        <div className={styles.playersList}>
          {room.players.map((player) => (
            <div key={player.id} className={styles.playerChip}>
              <span className={styles.playerAvatar}>
                {player.name[0].toUpperCase()}
              </span>
              <span className={styles.playerName}>
                {player.name}
                {player.id === room.hostId && ' 👑'}
                {player.id === currentPlayer.id && ' (You)'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {!isHost && (
        <div className={styles.hostMessage}>
          <p>🎯 Waiting for <strong>{room.players.find(p => p.id === room.hostId)?.name}</strong> to choose a game...</p>
        </div>
      )}

      <div className={styles.gamesGrid}>
        {GAME_OPTIONS.map((game) => (
          <div
            key={game.id}
            className={`${styles.gameCard} ${!isHost ? styles.disabled : ''} ${room.selectedGame === game.id ? styles.selected : ''}`}
            onClick={() => handleGameSelect(game.id)}
          >
            <div className={styles.gameIcon}>{game.icon}</div>
            <div className={styles.gameInfo}>
              <h3 className={styles.gameName}>{game.name}</h3>
              <p className={styles.gameDescription}>{game.description}</p>
              <div className={styles.gameDetails}>
                <span className={styles.gameDetail}>
                  👥 {game.minPlayers}-{game.maxPlayers} players
                </span>
                <span className={styles.gameDetail}>
                  ⏱️ {game.estimatedDuration}
                </span>
              </div>
            </div>
            {room.selectedGame === game.id && (
              <div className={styles.selectedBadge}>
                ✅ Selected
              </div>
            )}
            {!isHost && (
              <div className={styles.comingSoonBadge}>
                Coming Soon
              </div>
            )}
          </div>
        ))}
      </div>

      {room.selectedGame && (
        <div className={styles.selectedGameInfo}>
          <div className={styles.selectedGameCard}>
            <h3>🎮 Game Selected!</h3>
            <p>
              Get ready to play <strong>{GAME_OPTIONS.find(g => g.id === room.selectedGame)?.name}</strong>
            </p>
            <div className={styles.startingMessage}>
              <div className={styles.spinner}></div>
              <span>Starting game in a moment...</span>
            </div>
          </div>
        </div>
      )}

      {isHost && !room.selectedGame && (
        <div className={styles.hostInstructions}>
          <p>👑 <strong>You&apos;re the host!</strong> Choose a game above to get started.</p>
          <p className={styles.note}>
            Note: These games are placeholders for now. The lobby system is ready for when the games are implemented!
          </p>
        </div>
      )}
    </div>
  );
};