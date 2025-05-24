// src/apps/multiplayer/components/ConnectionScreen/index.tsx
'use client';

import { useState } from 'react';
import styles from './styles.module.css';

interface ConnectionScreenProps {
  playerName: string;
  onPlayerNameChange: (name: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onQuickMatch: (playerName: string) => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onCreateRoom: (playerName: string) => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onJoinRoom: (roomId: string, playerName: string) => Promise<any>;
  isLoading: boolean;
  error: string | null;
  onClearError: () => void;
}

export const ConnectionScreen = ({
  playerName,
  onPlayerNameChange,
  onQuickMatch,
  onCreateRoom,
  onJoinRoom,
  isLoading,
  error,
  onClearError,
}: ConnectionScreenProps) => {
  const [roomId, setRoomId] = useState('');
  const [mode, setMode] = useState<'quick' | 'create' | 'join'>('quick');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!playerName.trim()) {
      return;
    }

    onClearError();

    try {
      switch (mode) {
        case 'quick':
          await onQuickMatch(playerName.trim());
          break;
        case 'create':
          await onCreateRoom(playerName.trim());
          break;
        case 'join':
          if (!roomId.trim()) return;
          await onJoinRoom(roomId.trim().toUpperCase(), playerName.trim());
          break;
      }
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Multiplayer Lobby</h1>
        <p className={styles.subtitle}>Connect with friends and play games together!</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="playerName" className={styles.label}>
              Your Name
            </label>
            <input
              id="playerName"
              type="text"
              value={playerName}
              onChange={(e) => onPlayerNameChange(e.target.value)}
              placeholder="Enter your display name"
              className={styles.input}
              maxLength={20}
              required
            />
          </div>

          <div className={styles.modeSelector}>
            <button
              type="button"
              onClick={() => setMode('quick')}
              className={`${styles.modeButton} ${mode === 'quick' ? styles.active : ''}`}
            >
              Quick Match
            </button>
            <button
              type="button"
              onClick={() => setMode('create')}
              className={`${styles.modeButton} ${mode === 'create' ? styles.active : ''}`}
            >
              Create Room
            </button>
            <button
              type="button"
              onClick={() => setMode('join')}
              className={`${styles.modeButton} ${mode === 'join' ? styles.active : ''}`}
            >
              Join Room
            </button>
          </div>

          {mode === 'join' && (
            <div className={styles.inputGroup}>
              <label htmlFor="roomId" className={styles.label}>
                Room Code
              </label>
              <input
                id="roomId"
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                placeholder="Enter 6-letter room code"
                className={styles.input}
                maxLength={6}
                required
              />
            </div>
          )}

          {error && (
            <div className={styles.error}>
              <span>{error}</span>
              <button
                type="button"
                onClick={onClearError}
                className={styles.errorClose}
              >
                ×
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !playerName.trim() || (mode === 'join' && !roomId.trim())}
            className={styles.submitButton}
          >
            {isLoading ? (
              <span className={styles.loading}>
                <span className={styles.spinner}></span>
                {mode === 'quick' ? 'Finding Match...' : 
                 mode === 'create' ? 'Creating Room...' : 'Joining Room...'}
              </span>
            ) : (
              <>
                {mode === 'quick' && '🎮 Find Match'}
                {mode === 'create' && '🏠 Create Room'}
                {mode === 'join' && '🚪 Join Room'}
              </>
            )}
          </button>
        </form>

        <div className={styles.modeDescriptions}>
          <div className={styles.modeDescription}>
            <strong>Quick Match:</strong> Automatically find or create a room with another player
          </div>
          <div className={styles.modeDescription}>
            <strong>Create Room:</strong> Create a private room and share the code with friends
          </div>
          <div className={styles.modeDescription}>
            <strong>Join Room:</strong> Join a friend&apos;s room using their room code
          </div>
        </div>
      </div>
    </div>
  );
};