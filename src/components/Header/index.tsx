// src/components/Header/index.tsx
import React from 'react';
import Link from 'next/link';
import { Settings, Coffee, HelpCircle, Sun, Infinity } from 'lucide-react';
import { SettingsButton } from '../Settings';
import styles from './styles.module.css';

interface HeaderProps {
  gameTitle: string;
  alternateGamePath: string;
  alternateGameName: string;
  isHardMode: boolean;
  setIsHardMode: (value: boolean) => void;
  hasStartedGame: boolean;
  onModeChange: () => void;
  setShowRules: (show: boolean) => void;
}

export function Header({
  gameTitle,
  alternateGamePath,
  alternateGameName,
  isHardMode,
  setIsHardMode,
  hasStartedGame,
  onModeChange,
  setShowRules
}: HeaderProps) {
  return (
    <header className={styles.headerContainer}>
      <h1>{gameTitle}</h1>
      <div className={styles.headerButtons}>
        <button 
          onClick={() => setShowRules(true)} 
          className={styles.iconButton}
          aria-label="Rules"
        >
          <HelpCircle size={20} />
        </button>
        
        <Link 
          href={alternateGamePath} 
          className={styles.iconButton}
          aria-label={`Play ${alternateGameName}`}
        >
          {alternateGameName === 'Randle' ? <Infinity size={20} /> : <Sun size={20} />}
        </Link>
        
        <a 
          href="https://www.buymeacoffee.com/jameswhitford" 
          target="_blank" 
          rel="noopener noreferrer"
          className={styles.iconButton}
          aria-label="Buy me a coffee"
        >
          <Coffee size={20} />
        </a>
        
        <SettingsButton 
          isHardMode={isHardMode}
          setIsHardMode={setIsHardMode}
          hasStartedGame={hasStartedGame}
          onModeChange={onModeChange}
        />
      </div>
    </header>
  );
}