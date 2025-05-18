import React from 'react';
import Link from 'next/link';
import { Coffee, Sun, Infinity, Brain, Sparkles, Home } from 'lucide-react';
import { SettingsButton } from '../Settings';
import { RulesButton } from '../Rules';
import styles from './styles.module.css';

interface HeaderProps {
  gameTitle: string;
  alternateGamePath: string;
  alternateGameName: string;
  isHardMode: boolean;
  hasStartedGame: boolean;
  onModeChange: () => void;
  isDaily?: boolean;
}

export function Header({
  gameTitle,
  alternateGamePath,
  alternateGameName,
  isHardMode,
  hasStartedGame,
  onModeChange,
  isDaily
}: HeaderProps) {
  const handleModeToggle = () => {
    if (!hasStartedGame || confirm('Changing game mode will restart your current game. Continue?')) {
      onModeChange();
    }
  };

  return (
    <header className={styles.headerContainer}>
      <div className={styles.leftSection}>
        <Link
          href="/"
          className={styles.iconButton}
          aria-label="Go to Home"
          role="button"
        >
          <Home size={24} />
        </Link>
        <h1>{gameTitle}</h1>
      </div>
      <div className={styles.headerButtons}>
        <RulesButton isDaily={isDaily} />
        <button
          onClick={handleModeToggle}
          className={`${styles.iconButton} ${styles.modeToggle}`}
          aria-label={`Switch to ${isHardMode ? 'easy' : 'hard'} mode`}
          title={`${isHardMode ? 'Hard Mode (Manual)' : 'Easy Mode (Automatic)'}`}
        >
          {isHardMode ? <Brain size={24} /> : <Sparkles size={24} />}
        </button>
        <Link
          href={alternateGamePath}
          className={styles.iconButton}
          aria-label={`Play ${alternateGameName}`}
          role="button"
        >
          {alternateGameName === 'Randle' ? <Infinity size={24} /> : <Sun size={24} />}
        </Link>
        <a
          href="https://www.buymeacoffee.com/jameswhitford"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.iconButton}
          aria-label="Buy me a coffee"
          role="button"
        >
          <Coffee size={24} />
        </a>
        <SettingsButton
          isHardMode={isHardMode}
          hasStartedGame={hasStartedGame}
          onModeChange={onModeChange}
        />
      </div>
    </header>
  );
}