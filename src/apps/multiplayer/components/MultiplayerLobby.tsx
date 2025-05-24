// src/apps/multiplayer/components/MultiplayerLobby.tsx
'use client';

import { useState } from 'react';
import { useMultiplayer } from '../hooks/useMultiplayer';
import { Navbar } from './Navbar';
import { ConnectionScreen } from './ConnectionScreen';
import { RoomScreen } from './RoomScreen';
import { GameSelectionScreen } from './GameSelectionScreen';
import styles from './MultiplayerLobby.module.css';

export const MultiplayerLobby = () => {
  const {
    lobbyState,
    connectionStatus,
    currentRoom,
    currentPlayer,
    error,
    isLoading,
    isHost,
    isReady,
    allPlayersReady,
    roomFull,
    createRoom,
    joinRoom,
    quickMatch,
    updateReady,
    selectGame,
    leaveRoom,
    clearError,
  } = useMultiplayer();

  const [playerName, setPlayerName] = useState('');

  const renderCurrentScreen = () => {
    switch (lobbyState) {
      case 'finding-match':
      case 'creating-room':
      case 'joining-room':
        return (
          <ConnectionScreen
            playerName={playerName}
            onPlayerNameChange={setPlayerName}
            onQuickMatch={quickMatch}
            onCreateRoom={createRoom}
            onJoinRoom={joinRoom}
            isLoading={isLoading}
            error={error}
            onClearError={clearError}
          />
        );
      
      case 'in-room':
        return (
          <RoomScreen
            room={currentRoom}
            currentPlayer={currentPlayer}
            isHost={isHost}
            isReady={isReady}
            allPlayersReady={allPlayersReady}
            roomFull={roomFull}
            onUpdateReady={updateReady}
            onLeaveRoom={leaveRoom}
            connectionStatus={connectionStatus}
          />
        );
      
      case 'game-selection':
        return (
          <GameSelectionScreen
            room={currentRoom}
            currentPlayer={currentPlayer}
            isHost={isHost}
            onSelectGame={selectGame}
            onLeaveRoom={leaveRoom}
          />
        );
      
      case 'in-game':
        return (
          <div className={styles.gameScreen}>
            <h2>Game Starting Soon...</h2>
            <p>The selected game will load here.</p>
            <button onClick={leaveRoom} className={styles.leaveButton}>
              Leave Game
            </button>
          </div>
        );
      
      default:
        return <div>Loading...</div>;
    }
  };

  return (
    <div className={styles.container}>
      <Navbar 
        currentRoom={currentRoom}
        connectionStatus={connectionStatus}
        onLeaveRoom={leaveRoom}
      />
      <main className={styles.main}>
        {renderCurrentScreen()}
      </main>
    </div>
  );
};