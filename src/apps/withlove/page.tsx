"use client";

import React, { useState } from 'react';
import styles from './styles.module.css';

import LetterCollection from './components/LetterCollection';
import TextInput from './components/TextInput';
import HandwritingDisplay from './components/HandwritingDisplay';
import { clearAllTemplates } from './utils/strokeStorage';
import { convertTextToHandwriting, PositionedStroke } from './utils/textConverter';

type Step = 'collect' | 'convert' | 'display';

const WithLovePage: React.FC = () => {
  const [step, setStep] = useState<Step>('collect');
  const [inputText, setInputText] = useState('');
  const [handwritingStrokes, setHandwritingStrokes] = useState<PositionedStroke[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleCollectionComplete = () => {
    setStep('convert');
  };

  const handleTextSubmit = (text: string) => {
    setIsLoading(true);
    setInputText(text);
    // Simulate processing time
    setTimeout(() => {
      const strokes = convertTextToHandwriting(text);
      setHandwritingStrokes(strokes);
      setIsLoading(false);
      setStep('display');
    }, 500);
  };

  const handleDisplayReset = () => {
    setStep('convert');
    setInputText('');
    setHandwritingStrokes([]);
  };

  const handleStartOver = () => {
    clearAllTemplates();
    setStep('collect');
    setInputText('');
    setHandwritingStrokes([]);
  };

  const renderStepIndicator = () => (
    <div className={styles.stepIndicator}>
      <span className={step === 'collect' ? styles.activeStep : ''}>1. Collect Samples</span>
      <span>&rarr;</span>
      <span className={step === 'convert' ? styles.activeStep : ''}>2. Write Message</span>
      <span>&rarr;</span>
      <span className={step === 'display' ? styles.activeStep : ''}>3. View & Download</span>
    </div>
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>withLove - Handwriting Generator</h1>
        {renderStepIndicator()}
      </header>

      <main className={styles.main}>
        {isLoading ? (
          <div className={styles.loading}>Converting to handwriting...</div>
        ) : (
          <>
            {step === 'collect' && <LetterCollection onCollectionComplete={handleCollectionComplete} />}
            {step === 'convert' && <TextInput onTextSubmit={handleTextSubmit} />}
            {step === 'display' && (
              <HandwritingDisplay
                strokes={handwritingStrokes}
                originalText={inputText}
                onReset={handleDisplayReset}
              />
            )}
          </>
        )}
      </main>

      <footer className={styles.footer}>
        {step !== 'collect' && (
            <button onClick={handleStartOver} className={styles.startOverButton}>
                Start Over With New Samples
            </button>
        )}
      </footer>
    </div>
  );
};

export default WithLovePage;