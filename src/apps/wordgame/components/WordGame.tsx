'use client'
import React, { useCallback } from 'react';
import styles from './WordGame.module.css';
import { Header } from './Header';
import { Board } from './Board';
import { Keyboard } from './Keyboard';
import { EndGameModal } from './EndGameModal';
import { useGameState, useKeyboardHandling } from '../hooks';
import { WordGameProps } from '../types/game.types';

export function WordGame({ 
  gameWord, 
  onNewGame, 
  gameTitle, 
  alternateGamePath,
  alternateGameName,
  isDaily,
  validGuesses,
  cacheKey
}: WordGameProps) {
  const {
    currentGuess,
    isHardMode,
    tileStates,
    guessesRemaining,
    guessHistory,
    gameOver,
    gameWon,
    finalAttempts,
    keyboardColors,
    showEndModal,
    handlePlayAgain,
    toggleGameMode,
    submitGuess,
    updateCurrentGuess,
    handleTileMark,
    setShowEndModal,
  } = useGameState({
    gameWord,
    cacheKey,
    validGuesses,
    onNewGame
  });

  const { handleInput } = useKeyboardHandling({
    onInput: updateCurrentGuess,
    gameOver,
    currentGuess,
    onSubmit: () => submitGuess(currentGuess)
  });

  const shareScore = useCallback(async () => {
    const shareText = gameWon
      ? `I solved ${isDaily ? "today's" : ''} ${gameTitle} in ${finalAttempts} attempts! Can you beat that?`
      : `I couldn't solve ${isDaily ? "today's" : 'this'} ${gameTitle}. Can you do better?`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `My ${gameTitle} Score`,
          text: shareText,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        alert('Score copied to clipboard!');
      } catch (error) {
        console.error('Failed to copy score:', error);
        alert('Failed to copy score');
      }
    }
  }, [gameWon, isDaily, gameTitle, finalAttempts]);

  return (
    <div className={styles.container}>
      <Header
        gameTitle={gameTitle}
        alternateGamePath={alternateGamePath}
        alternateGameName={alternateGameName}
        isHardMode={isHardMode}
        hasStartedGame={guessHistory.length > 0}
        onModeChange={toggleGameMode}
      />

      <div className={styles.gameContainer}>
        <Board
          tileStates={tileStates}
          currentGuess={currentGuess}
          guessesRemaining={guessesRemaining}
          guessHistory={guessHistory}
          gameWord={gameWord}
          isHardMode={isHardMode}
          onTileMark={handleTileMark}
        />

        <Keyboard
          onKeyPress={handleInput}
          keyboardColors={keyboardColors}
          isGameOver={gameOver}
        />
      </div>

      <EndGameModal
        show={showEndModal}
        onClose={() => setShowEndModal(false)}
        gameWon={gameWon}
        gameWord={gameWord}
        finalAttempts={finalAttempts}
        isDaily={isDaily}
        onPlayAgain={handlePlayAgain}
        alternateGamePath={alternateGamePath}
        alternateGameName={alternateGameName}
        onShare={shareScore}
      />
    </div>
  );
}

export default WordGame;