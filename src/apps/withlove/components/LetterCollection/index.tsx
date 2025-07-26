"use client";

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

const DrawingCanvas = dynamic(() => import('../DrawingCanvas'), { ssr: false });
import * as strokeStorage from '../../utils/strokeStorage';
import { LetterStroke } from '../../types';
import styles from './styles.module.css';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

interface LetterCollectionProps {
  onCollectionComplete: () => void;
}

const LetterCollection: React.FC<LetterCollectionProps> = ({ onCollectionComplete }) => {
  const [currentLetter, setCurrentLetter] = useState<string>('A');
  const [completedLetters, setCompletedLetters] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  const findNextLetter = (progress: string[]) => {
    return ALPHABET.find(letter => !progress.includes(letter));
  }

  useEffect(() => {
    const progress = strokeStorage.getProgress();
    setCompletedLetters(progress);

    if (strokeStorage.hasAllLetters()) {
      setIsComplete(true);
      onCollectionComplete();
    } else {
      const nextLetter = findNextLetter(progress);
      if (nextLetter) {
        setCurrentLetter(nextLetter);
      }
    }
  }, [onCollectionComplete]);

  const handleStrokeComplete = (strokes: LetterStroke[]) => {
    if (!currentLetter) return;

    strokeStorage.saveLetterTemplate(currentLetter, strokes);
    const newCompleted = [...completedLetters, currentLetter];
    setCompletedLetters(newCompleted);

    const nextLetter = findNextLetter(newCompleted);

    if (nextLetter) {
      setCurrentLetter(nextLetter);
    } else {
      setIsComplete(true);
      onCollectionComplete();
    }
  };

  const handleStartOver = () => {
    strokeStorage.clearAllTemplates();
    setCompletedLetters([]);
    setCurrentLetter('A');
    setIsComplete(false);
  };

  return (
    <div className={styles.container}>
      {isComplete ? (
        <div className={styles.completeMessage}>
          <h2>Collection Complete!</h2>
          <p>All your handwriting samples have been saved.</p>
        </div>
      ) : (
        <>
          <div className={styles.instructions}>
            <h2>Draw the letter: {currentLetter}</h2>
          </div>
          <DrawingCanvas onStrokeComplete={handleStrokeComplete} />
        </>
      )}

      <div className={styles.progressContainer}>
        <h3>Progress</h3>
        <div className={styles.progressBar}>
          {ALPHABET.map(letter => (
            <span
              key={letter}
              className={`${styles.progressLetter} ${completedLetters.includes(letter) ? styles.completed : ''}`}>
              {letter}
            </span>
          ))}
        </div>
      </div>

      <button onClick={handleStartOver} className={styles.resetButton}>
        Start Over
      </button>
    </div>
  );
};

export default LetterCollection;
