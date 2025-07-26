"use client";

import React, { useState } from 'react';
import styles from './styles.module.css';

interface TextInputProps {
  onTextSubmit: (text: string) => void;
}

const VALID_INPUT_REGEX = /^[a-zA-Z\s]*$/;
const EXAMPLE_MESSAGES = ["Hello World", "With Love", "Thank You"];

const TextInput: React.FC<TextInputProps> = ({ onTextSubmit }) => {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = event.target.value;
    setText(newText);

    if (VALID_INPUT_REGEX.test(newText)) {
      setError(null);
    } else {
      setError('Invalid characters. Only letters (A-Z) and spaces are allowed for now.');
    }
  };

  const handleSubmit = () => {
    if (VALID_INPUT_REGEX.test(text) && text.trim().length > 0) {
      onTextSubmit(text.toUpperCase());
    } else if (text.trim().length === 0) {
        setError('Please enter a message.');
    }
    else {
      setError('Please fix the errors before converting.');
    }
  };

  const handleExampleClick = (message: string) => {
    setText(message);
    setError(null);
  };

  return (
    <div className={styles.container}>
      <div className={styles.examples}>
        <span>Try an example:</span>
        {EXAMPLE_MESSAGES.map(msg => (
          <button key={msg} onClick={() => handleExampleClick(msg)} className={styles.exampleButton}>
            {msg}
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={handleTextChange}
        className={styles.textarea}
        placeholder="Type your message here..."
        rows={4}
      />
      <div className={styles.meta}>
        <span className={styles.charCount}>{text.length} characters</span>
        {error && <span className={styles.error}>{error}</span>}
      </div>
      <button
        onClick={handleSubmit}
        className={styles.submitButton}
        disabled={!!error || text.trim().length === 0}
      >
        Convert to Handwriting
      </button>
    </div>
  );
};

export default TextInput;
