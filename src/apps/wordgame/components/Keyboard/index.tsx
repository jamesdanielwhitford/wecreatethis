import React from 'react';
import styles from './styles.module.css';
import { KeyboardProps, KeyboardButtonProps } from '../../types/game.types';

const KeyboardButton: React.FC<KeyboardButtonProps> = ({ 
  dataKey, 
  onClick, 
  className, 
  children 
}) => (
  <button
    data-key={dataKey}
    className={`${styles.keyboardButton} ${className || ''}`}
    onClick={() => onClick(dataKey)}
  >
    {children}
  </button>
);

export const Keyboard: React.FC<KeyboardProps> = ({
  onKeyPress,
  keyboardColors,
  isGameOver
}) => {
  const rows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
  ];

  const handleKeyPress = (key: string) => {
    if (!isGameOver) {
      onKeyPress(key);
    }
  };

  return (
    <div className={styles.keyboard}>
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className={styles.keyboardRow}>
          {row.map(key => {
            // Get the appropriate CSS class based on the color state
            const colorClass = keyboardColors[key] ? styles[keyboardColors[key]] : '';
            
            return (
              <KeyboardButton
                key={key}
                dataKey={key}
                onClick={handleKeyPress}
                className={`
                  ${key === 'ENTER' || key === 'BACKSPACE' ? styles.wideButton : ''} 
                  ${colorClass}
                `}
              >
                {key === 'BACKSPACE' ? '⌫' : key}
              </KeyboardButton>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default Keyboard;