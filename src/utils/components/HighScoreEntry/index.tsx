// src/utils/components/HighScoreEntry/index.tsx
import React, { useState, useEffect, useRef } from 'react';
import styles from './styles.module.css';

interface HighScoreEntryProps {
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

const HighScoreEntry: React.FC<HighScoreEntryProps> = ({ onSubmit, onCancel }) => {
  const [name, setName] = useState<string>('AAA');
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    // Focus and select all text on component mount
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    // Only allow A-Z characters and limit to 3
    const filteredValue = value.replace(/[^A-Z]/g, '').substring(0, 3);
    setName(filteredValue); // Allow empty value
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };
  
  const handleSubmit = () => {
    // Ensure name is exactly 3 letters
    const finalName = name.padEnd(3, 'A');
    onSubmit(finalName);
  };
  
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>NEW HIGH SCORE!</h2>
      <p className={styles.subtitle}>Enter your 3-letter name:</p>
      
      <div className={styles.nameInputContainer}>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className={styles.nameInput}
          maxLength={3}
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          inputMode="text"
          aria-label="Enter three letter name"
        />
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