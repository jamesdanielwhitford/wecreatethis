// src/utils/components/HighScoreEntry/index.tsx (Fixed)
import React, { useState, useEffect, useRef } from 'react';
import styles from './styles.module.css';

interface HighScoreEntryProps {
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

const HighScoreEntry: React.FC<HighScoreEntryProps> = ({ onSubmit, onCancel }) => {
  const [name, setName] = useState<string>('AAA');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const inputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  
  useEffect(() => {
    // Focus on the first input when component mounts
    if (inputRefs[0].current) {
      inputRefs[0].current.focus();
      // Select the text in the first input for easy replacement
      inputRefs[0].current.select();
    }
  }, []);
  
  // Handle key input for each letter
  const handleLetterChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    // Get the single letter directly from the input
    const letter = e.target.value.toUpperCase();
    
    // Only allow A-Z
    if (/^[A-Z]$/.test(letter)) {
      // Update the name - Fixed to avoid string iteration
      const newName = name.split('');
      newName[index] = letter;
      setName(newName.join(''));
      
      // Move to next input
      if (index < 2) {
        setCurrentIndex(index + 1);
        inputRefs[index + 1].current?.focus();
        inputRefs[index + 1].current?.select();
      }
    }
  };
  
  // Handle key down to navigate between inputs
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowLeft' && index > 0) {
      setCurrentIndex(index - 1);
      inputRefs[index - 1].current?.focus();
      inputRefs[index - 1].current?.select();
    } else if (e.key === 'ArrowRight' && index < 2) {
      setCurrentIndex(index + 1);
      inputRefs[index + 1].current?.focus();
      inputRefs[index + 1].current?.select();
    } else if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Backspace' && index > 0 && !e.currentTarget.value) {
      // If backspace is pressed on an empty input, move to the previous one
      setCurrentIndex(index - 1);
      inputRefs[index - 1].current?.focus();
      inputRefs[index - 1].current?.select();
    }
  };

  // Handle click on input field
  const handleInputClick = (index: number) => {
    setCurrentIndex(index);
    inputRefs[index].current?.select();
  };
  
  // Handle form submission
  const handleSubmit = () => {
    if (name.length === 3) {
      onSubmit(name);
    }
  };
  
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>NEW HIGH SCORE!</h2>
      <p className={styles.subtitle}>Enter your 3-letter name:</p>
      
      <div className={styles.inputContainer}>
        {[0, 1, 2].map((index) => (
          <input
            key={index}
            ref={inputRefs[index]}
            type="text"
            maxLength={1}
            value={name.charAt(index) || ''}
            onChange={(e) => handleLetterChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onClick={() => handleInputClick(index)}
            className={`${styles.letterInput} ${currentIndex === index ? styles.active : ''}`}
            autoComplete="off"
          />
        ))}
      </div>
      
      <div className={styles.buttonContainer}>
        <button className={styles.submitButton} onClick={handleSubmit}>
          SUBMIT
        </button>
        <button className={styles.cancelButton} onClick={onCancel}>
          CANCEL
        </button>
      </div>
    </div>
  );
};

export default HighScoreEntry;