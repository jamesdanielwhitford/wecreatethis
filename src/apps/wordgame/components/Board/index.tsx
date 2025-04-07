'use client'
import React from 'react';
import styles from './styles.module.css';
import { BoardProps } from '../../types/game.types';
import { useGameState } from '../../hooks';

export const Board: React.FC<BoardProps> = ({
  tileStates,
  currentGuess,
  guessesRemaining,
  guessHistory,
  gameWord,
  onTileMark
}) => {
  const { getCorrectLetterCount } = useGameState({
    gameWord,
    cacheKey: '', // Not needed for board functionality
    validGuesses: [], // Not needed for board functionality
  });

  return (
    <div className={styles.guessGrid}>
      {tileStates.map((row, rowIndex) => {
        const isCurrentRow = 8 - guessesRemaining === rowIndex;
        const guess = guessHistory[rowIndex] || '';
        const correctLetterCount = guess ? getCorrectLetterCount(guess, gameWord) : '';
        
        // Determine if we should apply the yellow class to the score square
        const isPartialMatch = typeof correctLetterCount === 'number' && 
                              correctLetterCount > 0 && 
                              correctLetterCount <= 4 && 
                              guess !== gameWord;
        
        return (
          <div 
            key={rowIndex} 
            className={`${styles.guessRow} ${guess === gameWord ? styles.correct : ''}`}
          >
            {row.map((tileState, colIndex) => (
              <div 
                key={colIndex}
                className={`
                  ${styles.letter} 
                  ${tileState.letter ? styles.guessed : ''} 
                  ${tileState.color === 'green' ? styles.green : ''}
                  ${tileState.color === 'red' ? styles.red : ''}
                  ${tileState.mark ? styles[tileState.mark] : ''}
                  ${tileState.dot ? styles[tileState.dot] : ''}
                  ${(typeof correctLetterCount === 'number' && correctLetterCount > 0 && correctLetterCount <= 4 && guess !== gameWord) ? styles.markable : ''}
                `}
                onClick={() => onTileMark(rowIndex, colIndex)}
              >
                {isCurrentRow ? currentGuess[colIndex] : tileState.letter}
              </div>
            ))}
            <div className={`${styles.score} ${isPartialMatch ? styles.yellow : ''}`}>
              {correctLetterCount}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Board;