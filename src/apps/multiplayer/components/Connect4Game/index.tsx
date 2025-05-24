// src/apps/multiplayer/components/Connect4Game/index.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Room, Player, Connect4GameState, Connect4Grid, Connect4CellValue, PostGameDecision } from '../../types/lobby.types';
import { MultiplayerService } from '../../utils/supabase';
import styles from './styles.module.css';

interface Connect4GameProps {
  room: Room;
  currentPlayer: Player;
  onLeaveRoom: () => void;
  onSelectNewGame: () => void;
}

const GRID_ROWS = 6;
const GRID_COLS = 7;

const createEmptyGrid = (): Connect4Grid => {
  return Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill('empty'));
};

const checkWinner = (grid: Connect4Grid, row: number, col: number, player: Connect4CellValue): {winner: boolean, cells: Array<{row: number, col: number}>} => {
  if (player === 'empty') return {winner: false, cells: []};

  const directions = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal \
    [1, -1]   // diagonal /
  ];

  for (const [dRow, dCol] of directions) {
    const cells = [{row, col}];
    
    // Check in positive direction
    let r = row + dRow;
    let c = col + dCol;
    while (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS && grid[r][c] === player) {
      cells.push({row: r, col: c});
      r += dRow;
      c += dCol;
    }
    
    // Check in negative direction
    r = row - dRow;
    c = col - dCol;
    while (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS && grid[r][c] === player) {
      cells.unshift({row: r, col: c});
      r -= dRow;
      c -= dCol;
    }
    
    if (cells.length >= 4) {
      return {winner: true, cells};
    }
  }
  
  return {winner: false, cells: []};
};

const isBoardFull = (grid: Connect4Grid): boolean => {
  return grid[0].every(cell => cell !== 'empty');
};

export const Connect4Game = ({ room, currentPlayer, onLeaveRoom, onSelectNewGame }: Connect4GameProps) => {
  const [gameState, setGameState] = useState<Connect4GameState | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [showPostGame, setShowPostGame] = useState(false);
  const [postGameDecisions, setPostGameDecisions] = useState<PostGameDecision[]>([]);
  const [myDecision, setMyDecision] = useState<string | null>(null);

  const multiplayerService = MultiplayerService.getInstance();

  // Initialize game state
  useEffect(() => {
    if (!gameState && room.players.length === 2) {
      const player1 = room.players[0];
      const player2 = room.players[1];
      
      const initialGameState: Connect4GameState = {
        grid: createEmptyGrid(),
        currentPlayer: 'player1',
        gameStatus: 'playing',
        moveHistory: [],
        player1Id: player1.id,
        player2Id: player2.id,
      };

      if (currentPlayer.id === room.hostId) {
        // Only host initializes the game state
        multiplayerService.updateGameState(room.id, initialGameState);
      }
    }
  }, [room, currentPlayer, gameState]);

  // Subscribe to game state changes
  useEffect(() => {
    if (room.gameState) {
      const state = room.gameState as Connect4GameState;
      setGameState(state);
      
      // Determine if it's current player's turn
      const isPlayer1 = currentPlayer.id === state.player1Id;
      const isPlayer2 = currentPlayer.id === state.player2Id;
      const currentTurn = state.currentPlayer;
      
      setIsMyTurn(
        (isPlayer1 && currentTurn === 'player1') || 
        (isPlayer2 && currentTurn === 'player2')
      );

      // Show post-game screen if game is over
      if (state.gameStatus !== 'playing' && !showPostGame) {
        setTimeout(() => setShowPostGame(true), 1500); // Delay to show winning animation
      }
    }
  }, [room.gameState, currentPlayer.id, showPostGame]);

  const makeMove = useCallback(async (column: number) => {
    if (!gameState || !isMyTurn || gameState.gameStatus !== 'playing') return;

    // Find the lowest empty row in the column
    let targetRow = -1;
    for (let row = GRID_ROWS - 1; row >= 0; row--) {
      if (gameState.grid[row][column] === 'empty') {
        targetRow = row;
        break;
      }
    }

    if (targetRow === -1) return; // Column is full

    // Create new grid with the move
    const newGrid = gameState.grid.map(row => [...row]);
    const currentPlayerValue = gameState.currentPlayer;
    newGrid[targetRow][column] = currentPlayerValue;

    // Check for winner
    const winCheck = checkWinner(newGrid, targetRow, column, currentPlayerValue);
    const boardFull = isBoardFull(newGrid);

    const newGameState: Connect4GameState = {
      ...gameState,
      grid: newGrid,
      currentPlayer: gameState.currentPlayer === 'player1' ? 'player2' : 'player1',
      gameStatus: winCheck.winner ? 'won' : (boardFull ? 'draw' : 'playing'),
      winner: winCheck.winner ? currentPlayerValue : undefined,
      winningCells: winCheck.winner ? winCheck.cells : undefined,
      moveHistory: [...gameState.moveHistory, {
        player: currentPlayerValue,
        column,
        row: targetRow
      }]
    };

    await multiplayerService.updateGameState(room.id, newGameState);
  }, [gameState, isMyTurn, room.id]);

  const handlePostGameDecision = async (decision: 'play-again' | 'choose-new-game' | 'leave') => {
    setMyDecision(decision);
    
    if (decision === 'leave') {
      onLeaveRoom();
      return;
    }

    if (decision === 'choose-new-game') {
      onSelectNewGame();
      return;
    }

    // For play-again, we need to wait for both players
    const newDecision: PostGameDecision = {
      playerId: currentPlayer.id,
      decision
    };

    const updatedDecisions = [...postGameDecisions.filter(d => d.playerId !== currentPlayer.id), newDecision];
    
    await multiplayerService.updatePostGameDecisions(room.id, updatedDecisions);
    
    // Check if both players want to play again
    if (updatedDecisions.length === 2 && updatedDecisions.every(d => d.decision === 'play-again')) {
      // Reset game for new round
      const player1 = room.players[0];
      const player2 = room.players[1];
      
      // Alternate who goes first
      const previousFirstPlayer = gameState?.player1Id === player1.id ? player2.id : player1.id;
      
      const newGameState: Connect4GameState = {
        grid: createEmptyGrid(),
        currentPlayer: previousFirstPlayer === player1.id ? 'player1' : 'player2',
        gameStatus: 'playing',
        moveHistory: [],
        player1Id: previousFirstPlayer,
        player2Id: previousFirstPlayer === player1.id ? player2.id : player1.id,
      };

      await multiplayerService.updateGameState(room.id, newGameState);
      await multiplayerService.updatePostGameDecisions(room.id, []);
      setShowPostGame(false);
      setMyDecision(null);
    }
  };

  // Subscribe to post-game decisions
  useEffect(() => {
    if (room.gameState?.postGameDecisions) {
      setPostGameDecisions(room.gameState.postGameDecisions);
    }
  }, [room.gameState?.postGameDecisions]);

  if (!gameState) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Setting up Connect 4...</p>
        </div>
      </div>
    );
  }

  const player1 = room.players.find(p => p.id === gameState.player1Id);
  const player2 = room.players.find(p => p.id === gameState.player2Id);
  const otherPlayer = room.players.find(p => p.id !== currentPlayer.id);

  return (
    <div className={styles.container}>
      <div className={styles.gameHeader}>
        <div className={styles.playerInfo}>
          <div className={`${styles.playerCard} ${gameState.currentPlayer === 'player1' ? styles.activePlayer : ''}`}>
            <div className={`${styles.playerDisc} ${styles.player1Disc}`}></div>
            <div className={styles.playerDetails}>
              <span className={styles.playerName}>
                {player1?.name}
                {player1?.id === currentPlayer.id && ' (You)'}
              </span>
              <span className={styles.playerColor}>Red</span>
            </div>
          </div>
          
          <div className={styles.vsText}>VS</div>
          
          <div className={`${styles.playerCard} ${gameState.currentPlayer === 'player2' ? styles.activePlayer : ''}`}>
            <div className={`${styles.playerDisc} ${styles.player2Disc}`}></div>
            <div className={styles.playerDetails}>
              <span className={styles.playerName}>
                {player2?.name}
                {player2?.id === currentPlayer.id && ' (You)'}
              </span>
              <span className={styles.playerColor}>Yellow</span>
            </div>
          </div>
        </div>
        
        <button onClick={onLeaveRoom} className={styles.leaveButton}>
          🚪 Leave Game
        </button>
      </div>

      <div className={styles.gameStatus}>
        {gameState.gameStatus === 'playing' && (
          <p>
            {isMyTurn ? "🎯 Your turn! Choose a column" : `⏳ Waiting for ${otherPlayer?.name}'s move...`}
          </p>
        )}
        {gameState.gameStatus === 'won' && (
          <p className={styles.winMessage}>
            🎉 {gameState.winner === 'player1' ? player1?.name : player2?.name} wins!
          </p>
        )}
        {gameState.gameStatus === 'draw' && (
          <p className={styles.drawMessage}>🤝 It&apos;s a draw!</p>
        )}
      </div>

      <div className={styles.gameBoard}>
        <div className={styles.grid}>
          {gameState.grid.map((row, rowIndex) => (
            <div key={rowIndex} className={styles.row}>
              {row.map((cell, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`${styles.cell} ${
                    gameState.winningCells?.some(c => c.row === rowIndex && c.col === colIndex) 
                      ? styles.winningCell 
                      : ''
                  }`}
                  onClick={() => isMyTurn && gameState.gameStatus === 'playing' && makeMove(colIndex)}
                  style={{
                    cursor: isMyTurn && gameState.gameStatus === 'playing' ? 'pointer' : 'default'
                  }}
                >
                  {cell !== 'empty' && (
                    <div className={`${styles.disc} ${cell === 'player1' ? styles.player1Disc : styles.player2Disc}`}></div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
        
        <div className={styles.columnHints}>
          {Array.from({ length: GRID_COLS }, (_, i) => (
            <div 
              key={i} 
              className={`${styles.columnHint} ${
                isMyTurn && gameState.gameStatus === 'playing' && gameState.grid[0][i] === 'empty' 
                  ? styles.activeColumn 
                  : ''
              }`}
              onClick={() => isMyTurn && gameState.gameStatus === 'playing' && makeMove(i)}
            >
              {isMyTurn && gameState.gameStatus === 'playing' && gameState.grid[0][i] === 'empty' && (
                <div className={`${styles.previewDisc} ${
                  gameState.currentPlayer === 'player1' ? styles.player1Disc : styles.player2Disc
                }`}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {showPostGame && (
        <div className={styles.postGameOverlay}>
          <div className={styles.postGameCard}>
            <h2 className={styles.postGameTitle}>
              {gameState.gameStatus === 'won' && 
                (gameState.winner === 'player1' ? player1?.name : player2?.name) === currentPlayer.name
                ? '🎉 You Won!'
                : gameState.gameStatus === 'won'
                ? '😔 You Lost'
                : '🤝 Draw Game!'
              }
            </h2>
            
            <div className={styles.gameStats}>
              <p>Moves played: {gameState.moveHistory.length}</p>
            </div>

            {!myDecision ? (
              <div className={styles.postGameActions}>
                <button
                  onClick={() => handlePostGameDecision('play-again')}
                  className={`${styles.actionButton} ${styles.playAgainButton}`}
                >
                  🔄 Play Again
                </button>
                <button
                  onClick={() => handlePostGameDecision('choose-new-game')}
                  className={`${styles.actionButton} ${styles.newGameButton}`}
                >
                  🎮 Choose New Game
                </button>
                <button
                  onClick={() => handlePostGameDecision('leave')}
                  className={`${styles.actionButton} ${styles.leaveGameButton}`}
                >
                  🚪 Leave Room
                </button>
              </div>
            ) : (
              <div className={styles.waitingDecision}>
                <p>You chose: <strong>{myDecision === 'play-again' ? 'Play Again' : 'Choose New Game'}</strong></p>
                {myDecision === 'play-again' && (
                  <p>⏳ Waiting for {otherPlayer?.name} to decide...</p>
                )}
              </div>
            )}

            {postGameDecisions.length > 0 && (
              <div className={styles.decisionsStatus}>
                <h4>Decisions:</h4>
                {postGameDecisions.map(decision => {
                  const player = room.players.find(p => p.id === decision.playerId);
                  return (
                    <p key={decision.playerId}>
                      {player?.name}: {decision.decision === 'play-again' ? '🔄 Play Again' : '🎮 New Game'}
                    </p>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};