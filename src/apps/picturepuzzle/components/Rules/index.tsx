// src/apps/picturepuzzle/components/Rules/index.tsx

import React from 'react';
import { RulesModalProps } from '../../types/games.types';
import styles from './styles.module.css';

const Rules: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2 className={styles.modalTitle}>How to Play Picture Puzzle</h2>
        
        <div className={styles.rulesSection}>
          <h3 className={styles.sectionTitle}>Objective</h3>
          <p className={styles.text}>
            Rearrange the image pieces to complete the picture, with the empty space at the bottom right.
          </p>
          
          <div className={styles.demoContainer}>
            <div className={styles.demoImage}>
              <img src="/images/picturepuzzle/demo.jpg" alt="Example of completed puzzle" className={styles.demoImg} />
              <div className={styles.demoArrow}>→</div>
              <div className={styles.demoGrid}>
                <div className={styles.demoGridCell}></div>
                <div className={styles.demoGridCell}></div>
                <div className={styles.demoGridCell}></div>
                <div className={styles.demoGridCell}></div>
                <div className={styles.demoGridCell}></div>
                <div className={styles.demoGridCell}></div>
                <div className={styles.demoGridCell}></div>
                <div className={styles.demoGridCell}></div>
                <div className={styles.demoGridCell}></div>
                <div className={styles.demoGridCell}></div>
                <div className={styles.demoGridCell}></div>
                <div className={styles.demoGridCell}></div>
                <div className={styles.demoGridCell}></div>
                <div className={styles.demoGridCell}></div>
                <div className={styles.demoGridCell}></div>
                <div className={styles.demoEmptyCell}></div>
              </div>
            </div>
            <p className={styles.demoCaption}>
              The image is split into 16 pieces. Arrange them to complete the picture.
            </p>
          </div>
          
          <h3 className={styles.sectionTitle}>Game Modes</h3>
          <h4 className={styles.sectionSubtitle}>Daily Mode</h4>
          <p className={styles.text}>
            A new picture puzzle is available each day. Your progress is saved.
            Once completed, you&apos;ll need to wait until the next day for a new puzzle.
          </p>
          
          <h4 className={styles.sectionSubtitle}>Infinite Mode</h4>
          <p className={styles.text}>
            Play with as many different pictures as you like. You can select different images
            and create new puzzles anytime.
          </p>
          
          <h4 className={styles.sectionSubtitle}>Impossible Mode</h4>
          <p className={styles.text}>
            A truly challenging version where the image pieces are scrambled in a special way! 
            Even when you arrange the numbers 1-15 in order with the blank space at position 16, 
            the image will appear distorted. Can you solve the puzzle while visualizing how the pieces should connect?
          </p>
          <p className={styles.text}>
            <strong>Hint:</strong> In Impossible Mode, the blank piece is mapped to the top-left of the image instead of the bottom-right.
          </p>
          
          <h3 className={styles.sectionTitle}>How to Play</h3>
          <ul className={styles.rulesList}>
            <li className={styles.text}>Tap on a piece adjacent to the empty space to move it.</li>
            <li className={styles.text}>You can also tap any piece in the same row or column as the empty space:</li>
            <ul className={styles.secondaryList}>
              <li className={styles.text}>All pieces between the tapped piece and the empty space will move together.</li>
              <li className={styles.text}>This lets you move multiple pieces in one move, like sliding an entire row or column.</li>
            </ul>
            <li className={styles.text}>The timer starts when you make your first move.</li>
            <li className={styles.text}>Tap the timer to pause the game.</li>
            <li className={styles.text}>A preview of the complete image is shown at the bottom to help you solve the puzzle.</li>
            <li className={styles.text}>The game ends when all pieces are in their correct positions.</li>
          </ul>
          
          <h3 className={styles.sectionTitle}>Tips</h3>
          <ul className={styles.rulesList}>
            <li className={styles.text}>Look at the preview image to understand where each piece should go.</li>
            <li className={styles.text}>Focus on completing one row or column at a time.</li>
            <li className={styles.text}>Pay attention to distinctive features in the image to identify where pieces belong.</li>
            <li className={styles.text}>The last few pieces are often the trickiest - take your time!</li>
            <li className={styles.text}>For Impossible Mode, you&apos;ll need to mentally remap the pieces to solve the puzzle.</li>
          </ul>
        </div>
        
        <button className={styles.closeButton} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default Rules;