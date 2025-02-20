'use client';

import React from 'react';
import { Settings } from 'lucide-react';
import { useTheme } from '@/features/theme';
import styles from './styles.module.css';

interface SettingsModalProps {
  isHardMode: boolean;
  hasStartedGame: boolean;
  onModeChange: () => void;
}

export function SettingsButton({
  isHardMode,
  hasStartedGame,
  onModeChange
}: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const [showModal, setShowModal] = React.useState(false);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
  };

  const handleModeChange = () => {
    if (!hasStartedGame || confirm('Changing game mode will restart your current game. Continue?')) {
      onModeChange();
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={styles.iconButton}
        aria-label="Settings"
      >
        <Settings size={24} />
      </button>

      {showModal && (
        <div className={styles.modal} onClick={() => setShowModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button className={styles.closeButton} onClick={() => setShowModal(false)}>×</button>
            <h2>Settings</h2>

            <div className={styles.settingsSection}>
              <h3>Theme</h3>
              <div className={styles.themeButtons}>
                <button
                  className={`${styles.themeButton} ${theme === 'light' ? styles.activeTheme : ''}`}
                  onClick={() => handleThemeChange('light')}
                >
                  Light
                </button>
                <button
                  className={`${styles.themeButton} ${theme === 'dark' ? styles.activeTheme : ''}`}
                  onClick={() => handleThemeChange('dark')}
                >
                  Dark
                </button>
                <button
                  className={`${styles.themeButton} ${theme === 'system' ? styles.activeTheme : ''}`}
                  onClick={() => handleThemeChange('system')}
                >
                  System
                </button>
              </div>
            </div>

            <div className={styles.settingsSection}>
              <h3>Game Mode</h3>
              <div className={styles.modeToggle}>
                <div className={styles.modeButtons}>
                  <button
                    onClick={handleModeChange}
                    className={`${styles.modeToggleButton} ${isHardMode ? styles.activeMode : ''}`}
                    disabled={hasStartedGame}
                  >
                    Hard Mode
                  </button>
                  <button
                    onClick={handleModeChange}
                    className={`${styles.modeToggleButton} ${!isHardMode ? styles.activeMode : ''}`}
                    disabled={hasStartedGame}
                  >
                    Easy Mode (Beta)
                  </button>
                </div>
                <p className={styles.modeDescription}>
                  {isHardMode ? 'Manual deduction mode' : 'Automatic hint mode'}
                </p>
                {hasStartedGame && (
                  <p className={styles.modeDisabledText}>
                    Game mode cannot be changed after starting a game
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}