// src/apps/fifteenpuzzle/components/Rules/index.tsx

import React, { useState, useEffect } from 'react';
import { RulesModalProps } from '../../types/game.types';
import styles from './styles.module.css';

// Mini game types
interface MiniTile {
  value: number;
  position: number;
}

const Rules: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  // Mini game state
  const [miniTiles, setMiniTiles] = useState<MiniTile[]>([]);
  const [emptyPosition, setEmptyPosition] = useState<number>(3); // Bottom right is initially empty
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [goldTiles, setGoldTiles] = useState<number[]>([]);
  
  // Reset the mini game whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      resetMiniGame();
    }
  }, [isOpen]);
  
  // Initialize mini game
  const resetMiniGame = () => {
    // Initial state: 3, 1 on top row, 2, empty on bottom row
    setMiniTiles([
      { value: 3, position: 0 },
      { value: 1, position: 1 },
      { value: 2, position: 2 },
      { value: 0, position: 3 } // 0 represents empty space
    ]);
    setEmptyPosition(3);
    setIsComplete(false);
    setGoldTiles([]);
  };
  
  // Check if mini game is complete (should be in order either empty, 1, 2, 3 or 1, 2, 3, empty)
  const checkMiniGameComplete = (tiles: MiniTile[]): boolean => {
    const orderedValues = tiles
      .sort((a, b) => a.position - b.position)
      .map(tile => tile.value);
    
    // Check if it matches either target state [0, 1, 2, 3] or [1, 2, 3, 0]
    return JSON.stringify(orderedValues) === JSON.stringify([1, 2, 3, 0]) || 
           JSON.stringify(orderedValues) === JSON.stringify([0, 1, 2, 3]);
  };
  
  // Handle mini game tile click
  const handleMiniTileClick = (position: number) => {
    // Don't allow moves if game is complete or already animating
    if (isComplete || goldTiles.length > 0) return;
    
    // Check if move is valid (adjacent to empty space)
    const isValidMove = (
      // Same row, adjacent column
      (Math.floor(position / 2) === Math.floor(emptyPosition / 2) && 
        Math.abs(position % 2 - emptyPosition % 2) === 1) ||
      // Same column, adjacent row
      (position % 2 === emptyPosition % 2 && 
        Math.abs(Math.floor(position / 2) - Math.floor(emptyPosition / 2)) === 1)
    );
    
    if (!isValidMove) return;
    
    // Move the tile
    const updatedTiles = miniTiles.map(tile => {
      if (tile.position === position) {
        return { ...tile, position: emptyPosition };
      }
      if (tile.value === 0) {
        return { ...tile, position: position };
      }
      return tile;
    });
    
    // Update state
    setMiniTiles(updatedTiles);
    setEmptyPosition(position);
    
    // Check if game is complete
    const complete = checkMiniGameComplete(updatedTiles);
    if (complete) {
      setIsComplete(true);
      
      // Start win animation
      const nonEmptyTiles = updatedTiles
        .filter(tile => tile.value !== 0)
        .map(tile => tile.value);
      
      // Sort so animation plays in numerical order
      nonEmptyTiles.sort((a, b) => a - b);
      
      // Clear existing gold tiles first
      setGoldTiles([]);
      
      // Animate each tile one by one with a delay
      nonEmptyTiles.forEach((tileValue, index) => {
        setTimeout(() => {
          setGoldTiles(prev => [...prev, tileValue]);
        }, (index + 1) * 150); // 150ms delay between each tile
      });
      
      // Reset game after animation completes
      setTimeout(() => {
        resetMiniGame();
      }, (nonEmptyTiles.length * 150) + 1500); // Wait for animation + 1.5s
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2 className={styles.modalTitle}>How to Play 15-Puzzle</h2>
        
        <div className={styles.rulesSection}>
          <h3 className={styles.sectionTitle}>Objective</h3>
          <p className={styles.text}>Arrange the tiles in numerical order, with the empty space at the end.</p>
          
          <div className={styles.miniGameContainer}>
            <h3 className={styles.sectionTitle}>Try it yourself!</h3>
            <p className={styles.text}>Tap a tile that&apos;s adjacent to the empty space to move it.</p>
            
            <div className={styles.miniBoard}>
              {[0, 1, 2, 3].map(position => {
                const tile = miniTiles.find(t => t.position === position);
                const isEmpty = tile?.value === 0;
                const isGold = isComplete && goldTiles.includes(tile?.value as number);
                
                return (
                  <div
                    key={position}
                    className={`${styles.miniTileContainer} ${isEmpty ? styles.emptyMiniTileContainer : ''}`}
                    style={{
                      gridRow: Math.floor(position / 2) + 1,
                      gridColumn: (position % 2) + 1,
                    }}
                    onClick={() => !isEmpty && handleMiniTileClick(position)}
                  >
                    {!isEmpty ? (
                      <div 
                        className={`
                          ${styles.miniTile} 
                          ${isComplete ? styles.complete : ''} 
                          ${isGold ? styles.gold : ''}
                        `}
                      >
                        {tile?.value}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <p className={styles.miniGameHint}>
              {isComplete ? 'Well done! The puzzle is solved.' : 'Goal: Arrange as 1-2-3-empty or empty-1-2-3'}
            </p>
          </div>
          
          <h3 className={styles.sectionTitle}>Game Modes</h3>
          <h4 className={styles.sectionSubtitle}>Daily Mode</h4>
          <p className={styles.text}>
            A new puzzle is available each day. Your progress is saved.
            Once completed, you&apos;ll need to wait until the next day for a new puzzle.
          </p>
          
          <h4 className={styles.sectionSubtitle}>Infinite Mode</h4>
          <p className={styles.text}>
            Play as many different puzzles as you like. Each time you restart,
            a new random puzzle will be generated.
          </p>
          
          <h3 className={styles.sectionTitle}>How to Play</h3>
          <ul className={styles.rulesList}>
            <li className={styles.text}>Tap on a tile adjacent to the empty space to move it.</li>
            <li className={styles.text}>You can also tap any tile in the same row or column as the empty space:</li>
            <ul className={styles.secondaryList}>
              <li className={styles.text}>All tiles between the tapped tile and the empty space will move together.</li>
              <li className={styles.text}>This lets you move multiple tiles in one move, like sliding an entire row or column.</li>
            </ul>
            <li className={styles.text}>The timer starts when you make your first move.</li>
            <li className={styles.text}>Tap the timer to pause the game.</li>
            <li className={styles.text}>The game ends when all tiles are in numerical order.</li>
          </ul>
          
          <h3 className={styles.sectionTitle}>Winning Conditions</h3>
          <p className={styles.text}>
            The puzzle is solved when the tiles are in numerical order (1-15),
            with the empty space at the end.
          </p>
          
          <div className={styles.exampleContainer}>
            <p className={styles.text}><strong>Example of solved puzzle:</strong></p>
            <div className={styles.exampleRow}>
              <span className={styles.exampleTile}>1</span>
              <span className={styles.exampleTile}>2</span>
              <span className={styles.exampleTile}>3</span>
              <span className={styles.exampleTile}>4</span>
            </div>
            <div className={styles.exampleRow}>
              <span className={styles.exampleTile}>5</span>
              <span className={styles.exampleTile}>6</span>
              <span className={styles.exampleTile}>7</span>
              <span className={styles.exampleTile}>8</span>
            </div>
            <div className={styles.exampleRow}>
              <span className={styles.exampleTile}>9</span>
              <span className={styles.exampleTile}>10</span>
              <span className={styles.exampleTile}>11</span>
              <span className={styles.exampleTile}>12</span>
            </div>
            <div className={styles.exampleRow}>
              <span className={styles.exampleTile}>13</span>
              <span className={styles.exampleTile}>14</span>
              <span className={styles.exampleTile}>15</span>
              <span className={styles.exampleEmpty}></span>
            </div>
          </div>
        </div>
        
        <button className={styles.closeButton} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default Rules;