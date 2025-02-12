// src/components/Settings/index.tsx
'use client';
import React from 'react';
import { Settings } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import styles from './styles.module.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isHardMode: boolean;
  setIsHardMode: (value: boolean) => void;
  hasStartedGame: boolean;
  onModeChange: () => void;
}

interface SettingsButtonProps {
  isHardMode: boolean;
  setIsHardMode: (value: boolean) => void;
  hasStartedGame: boolean;
  onModeChange: () => void;
}

function SettingsModal({
  isOpen,
  onClose,
  isHardMode,
  setIsHardMode,
  hasStartedGame,
  onModeChange,
}: SettingsModalProps) {
  const { theme, setTheme } = useTheme();

  const handleModeChange = () => {
    setIsHardMode(!isHardMode);
    onModeChange();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modal} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>×</button>
        <h2>Settings</h2>
        <div className={styles.settingsSection}>
          <h3>Theme</h3>
          <div className={styles.themeButtons}>
            <button
              className={`${styles.themeButton} ${theme === 'light' ? styles.activeTheme : ''}`}
              onClick={() => setTheme('light')}
            >
              Light
            </button>
            <button
              className={`${styles.themeButton} ${theme === 'dark' ? styles.activeTheme : ''}`}
              onClick={() => setTheme('dark')}
            >
              Dark
            </button>
            <button
              className={`${styles.themeButton} ${theme === 'system' ? styles.activeTheme : ''}`}
              onClick={() => setTheme('system')}
            >
              System
            </button>
          </div>
        </div>
        <div className={styles.settingsSection}>
          <h3>Game Mode</h3>
          <div className={styles.modeToggle}>
            <button
              onClick={handleModeChange}
              className={`${styles.modeButton} ${isHardMode ? styles.hardMode : styles.easyMode}`}
              disabled={hasStartedGame}
              title={hasStartedGame ? "Cannot change mode after starting game" : ""}
            >
              {isHardMode ? 'Hard Mode' : 'Easy Mode (Beta)'}
            </button>
            {hasStartedGame && (
              <p className={styles.modeDisabledText}>
                Game mode cannot be changed after starting a game
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SettingsButton(props: SettingsButtonProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={styles.iconButton}
        aria-label="Settings"
      >
        <Settings size={20} />
      </button>
      {isOpen && (
        <SettingsModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          isHardMode={props.isHardMode}
          setIsHardMode={props.setIsHardMode}
          hasStartedGame={props.hasStartedGame}
          onModeChange={props.onModeChange}
        />
      )}
    </>
  );
}