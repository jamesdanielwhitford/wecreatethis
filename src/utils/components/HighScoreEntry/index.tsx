// src/utils/components/HighScoreEntry/index.tsx
import React, { useState, useEffect, useRef } from 'react';
import styles from './styles.module.css';

interface HighScoreEntryProps {
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

const HighScoreEntry: React.FC<HighScoreEntryProps> = ({ onSubmit, onCancel }) => {
  const [name, setName] = useState<string>('AAA');
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  
  // Create refs for each letter input
  const inputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const singleInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    // Detect mobile devices based on screen size and touch capability
    const checkMobile = () => {
      return window.innerWidth <= 768 || ('ontouchstart' in window);
    };
    
    setIsMobile(checkMobile());
    
    // Add resize listener to update mobile state
    const handleResize = () => setIsMobile(checkMobile());
    window.addEventListener('resize', handleResize);
    
    // Focus the appropriate input on component mount
    if (isMobile && singleInputRef.current) {
      singleInputRef.current.focus();
    } else if (inputRefs[0].current) {
      inputRefs[0].current.focus();
      inputRefs[0].current.select();
    }
    
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);
  
  // Handle single input change for mobile
  const handleSingleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    // Only allow a-z and A-Z
    const filteredValue = value.replace(/[^A-Z]/g, '').substring(0, 3);
    setName(filteredValue.padEnd(3, 'A'));
  };
  
  // Handle change for individual letter inputs
  const handleLetterChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    // Get uppercase letter, limiting to 1 character
    const letter = e.target.value.toUpperCase().charAt(0);
    
    // Only allow A-Z 
    if (/^[A-Z]$/.test(letter)) {
      const nameArray = name.split('');
      nameArray[index] = letter;
      setName(nameArray.join(''));
      
      // Move to next input if not the last one
      if (index < 2) {
        setCurrentIndex(index + 1);
        inputRefs[index + 1].current?.focus();
        inputRefs[index + 1].current?.select();
      }
    }
  };
  
  // Handle keyboard navigation
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
    } else if (e.key === 'Backspace' && index > 0 && e.currentTarget.value === '') {
      // If backspace is pressed on an empty input, move to previous
      setCurrentIndex(index - 1);
      inputRefs[index - 1].current?.focus();
      inputRefs[index - 1].current?.select();
    }
  };
  
  // Handle paste event for desktop
  const handlePaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').toUpperCase();
    
    if (pastedText) {
      const validChars = pastedText.replace(/[^A-Z]/g, '');
      
      if (validChars.length > 0) {
        // Create a new name array
        const newName = name.split('');
        
        // Fill from current position
        for (let i = 0; i < Math.min(validChars.length, 3 - index); i++) {
          newName[index + i] = validChars.charAt(i);
        }
        
        setName(newName.join(''));
        
        // Focus the next appropriate input
        const nextIndex = Math.min(index + validChars.length, 2);
        setCurrentIndex(nextIndex);
        inputRefs[nextIndex].current?.focus();
        inputRefs[nextIndex].current?.select();
      }
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
  
  // Handle touch events for mobile
  const handleTouchStart = (index: number) => {
    setCurrentIndex(index);
    // Use setTimeout to ensure the select happens after the focus
    setTimeout(() => {
      inputRefs[index].current?.select();
    }, 50);
  };
  
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>NEW HIGH SCORE!</h2>
      <p className={styles.subtitle}>Enter your 3-letter name:</p>
      
      {isMobile ? (
        // Mobile-friendly single input
        <div className={styles.singleInputContainer}>
          <input
            ref={singleInputRef}
            type="text"
            value={name}
            onChange={handleSingleInputChange}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            maxLength={3}
            className={styles.singleLetterInput}
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            inputMode="text"
            aria-label="Enter three letter name"
          />
          <div className={styles.visualLetters}>
            {name.split('').map((letter, idx) => (
              <div key={idx} className={styles.visualLetter}>
                {letter}
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Desktop version with separate inputs
        <div className={styles.inputContainer}>
          {[0, 1, 2].map((index) => (
            <input
              key={index}
              ref={inputRefs[index]}
              type="text"
              value={name.charAt(index) || ''}
              onChange={(e) => handleLetterChange(index, e)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={(e) => handlePaste(index, e)}
              onClick={() => handleInputClick(index)}
              onTouchStart={() => handleTouchStart(index)}
              className={`${styles.letterInput} ${currentIndex === index ? styles.active : ''}`}
              maxLength={1}
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              inputMode="text"
              aria-label={`Letter ${index + 1}`}
            />
          ))}
        </div>
      )}
      
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