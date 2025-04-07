// src/apps/fifteenpuzzle/components/Board/index.tsx

import React, { useMemo, useState, useEffect } from 'react';
import { BoardProps, Tile } from '../../types/game.types';
import styles from './styles.module.css';

const Board: React.FC<BoardProps> = ({ 
  tiles, 
  onTileClick, 
  isComplete, 
  isPaused,
  onWinAnimationComplete 
}) => {
  // Track which tiles have completed their "win" animation
  const [goldTiles, setGoldTiles] = useState<number[]>([]);
  
  // Ensure we have exactly 16 tiles (values 0-15)
  const validTiles = useMemo(() => {
    // Check if we have all the expected tiles
    const values = new Set(tiles.map(tile => tile.value));
    const positions = new Set(tiles.map(tile => tile.position));
    
    // If we don't have exactly 16 tiles with values 0-15 and positions 0-15, log error
    if (values.size !== 16 || positions.size !== 16) {
      console.error('Invalid tile configuration:', tiles);
      
      // Create a fallback set of tiles
      const fallbackTiles: Tile[] = [];
      for (let i = 0; i < 16; i++) {
        fallbackTiles.push({
          value: i,
          position: i
        });
      }
      return fallbackTiles;
    }
    
    return tiles;
  }, [tiles]);
  
  // Create the grid cells - always 16 cells (4x4 grid)
  const gridCells = useMemo(() => {
    const cells = Array(16).fill(null);
    
    // Place each tile in its position
    validTiles.forEach(tile => {
      if (tile.position >= 0 && tile.position < 16) {
        cells[tile.position] = tile;
      }
    });
    
    return cells;
  }, [validTiles]);
  
  // Handle win animation
  useEffect(() => {
    if (isComplete && goldTiles.length < 15) { // 15 non-empty tiles
      // Reset gold tiles when game is newly completed
      if (goldTiles.length === 0) {
        setGoldTiles([]);
        
        // Start animation sequence
        const nonEmptyTiles = validTiles
          .filter(tile => tile.value !== 0)
          .map(tile => tile.value);
          
        // Sort so animation plays in numerical order
        nonEmptyTiles.sort((a, b) => a - b);
        
        // Animate each tile one by one with a delay
        nonEmptyTiles.forEach((tileValue, index) => {
          setTimeout(() => {
            setGoldTiles(prev => [...prev, tileValue]);
            
            // If this is the last tile, notify parent component
            if (index === nonEmptyTiles.length - 1) {
              // Delay win modal slightly after last tile turns gold
              setTimeout(() => {
                if (onWinAnimationComplete) {
                  onWinAnimationComplete();
                }
              }, 500);
            }
          }, index * 150); // 150ms delay between each tile
        });
      }
    } else if (!isComplete) {
      // Reset when game is no longer complete
      setGoldTiles([]);
    }
  }, [isComplete, goldTiles.length, validTiles, onWinAnimationComplete]);
  
  return (
    <div className={styles.board}>
      {gridCells.map((tile, position) => {
        // Handle the case where a position doesn't have a tile (shouldn't happen if data is valid)
        const value = tile ? tile.value : null;
        const isEmpty = value === 0;
        const isGold = isComplete && goldTiles.includes(value as number);
        
        return (
          <div
            key={position}
            className={`${styles.tileContainer} ${isEmpty ? styles.emptyTileContainer : ''}`}
            style={{
              gridRow: Math.floor(position / 4) + 1,
              gridColumn: (position % 4) + 1,
            }}
            onClick={() => !isEmpty && !isPaused && onTileClick(position)}
          >
            {!isEmpty && (
              <div 
                className={`
                  ${styles.tile} 
                  ${isComplete ? styles.complete : ''} 
                  ${isGold ? styles.gold : ''}
                `}
              >
                {value}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Board;