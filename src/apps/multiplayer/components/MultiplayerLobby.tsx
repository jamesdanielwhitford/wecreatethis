// src/apps/multiplayer/components/MultiplayerLobby.tsx
'use client';

import { useState } from 'react';
import { useMultiplayer } from '../hooks/useMultiplayer';
import { Navbar } from './Navbar';
import { ConnectionScreen } from './ConnectionScreen';
import { RoomScreen } from './RoomScreen';
import { GameSelectionScreen } from './GameSelectionScreen';
import { Connect4Game } from './Connect4Game';
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

  const handleSelectNewGame = () => {
    // Reset game state and go back to game selection
    if (currentRoom) {
      // Clear the game state and selected game
      selectGame(''); // This will clear the selected game
    }
  };

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
        // Check which game is selected and render the appropriate component
        if (currentRoom?.selectedGame === 'connect4' && currentPlayer) {
          return (
            <Connect4Game
              room={currentRoom}
              currentPlayer={currentPlayer}
              onLeaveRoom={leaveRoom}
              onSelectNewGame={handleSelectNewGame}
            />
          );
        }
        
        // Default fallback for other games
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