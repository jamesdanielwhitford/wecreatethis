import { useEffect, useCallback } from 'react';
import { UseKeyboardHandlingProps } from '../types/game.types';

export const useKeyboardHandling = ({
  onInput,
  gameOver,
  currentGuess,
  onSubmit
}: UseKeyboardHandlingProps) => {
  const handleInput = useCallback((key: string) => {
    if (gameOver) return;

    if (key === 'ENTER') {
      if (currentGuess.length === 4) {
        onSubmit();
      } else {
        alert('Please enter a 4-letter word.');
      }
    } else if (key === 'BACKSPACE') {
      onInput(currentGuess.slice(0, -1));
    } else if (currentGuess.length < 4) {
      onInput(currentGuess + key);
    }
  }, [currentGuess, gameOver, onSubmit, onInput]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key.match(/^[a-z]$/i)) {
        handleInput(e.key.toUpperCase());
      } else if (e.key === 'Enter') {
        handleInput('ENTER');
      } else if (e.key === 'Backspace') {
        handleInput('BACKSPACE');
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleInput]);

  return {
    handleInput
  };
};

export default useKeyboardHandling;