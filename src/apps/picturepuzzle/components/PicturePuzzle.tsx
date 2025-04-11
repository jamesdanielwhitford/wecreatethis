// src/apps/picturepuzzle/components/PicturePuzzle.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useGameState } from '../hooks/useGameState';
import { useTimer } from '../hooks/useTimer';
import Board from './Board';
import Navbar from './Navbar';
import Rules from './Rules';
import EndGameModal from './EndGameModal';
import ImageSelect from './ImageSelect';
import PreviewModal from './PreviewModal'; // New component for preview modal
import { GameMode } from '../types/games.types';
import { getImageDimensions } from '../utils/imageScaling';
import styles from './PicturePuzzle.module.css';

interface PicturePuzzleProps {
  initialMode?: GameMode;
}

const PicturePuzzle: React.FC<PicturePuzzleProps> = ({ initialMode = 'daily' }) => {
  // State for modals
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isWinModalOpen, setIsWinModalOpen] = useState(false);
  const [isImageSelectOpen, setIsImageSelectOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false); // New state for preview modal
  const [hasUserDismissedWinModal, setHasUserDismissedWinModal] = useState(false);
  
  // Reference to track board size for responsive design
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const [tileSize, setTileSize] = useState(100); // Default tile size
  
  // Track image dimensions
  const [imageDimensions, setImageDimensions] = useState({ width: 400, height: 400 });
  
  const {
    gameState,
    handleTileClick,
    resetGame,
    changeGameMode,
    hasDailyBeenCompleted,
    togglePause,
    handleWinAnimationComplete,
    changeImage
  } = useGameState(initialMode);

  const isGameStarted = gameState.moves > 0 || gameState.startTime !== null;
  
  const { timerState, resetTimer } = useTimer(
    isGameStarted,
    gameState.isComplete,
    gameState.isPaused,
    gameState.pausedTime
  );

  // Show win modal when win animation is complete
  useEffect(() => {
    if (gameState.isComplete && gameState.winAnimationComplete && !isWinModalOpen && !hasUserDismissedWinModal) {
      setIsWinModalOpen(true);
    }
  }, [gameState.isComplete, gameState.winAnimationComplete, isWinModalOpen, hasUserDismissedWinModal]);

  // Calculate tile size based on container width
  useEffect(() => {
    const updateTileSize = () => {
      if (boardContainerRef.current) {
        const containerWidth = boardContainerRef.current.clientWidth;
        // Each tile is 1/4 of the board minus gaps
        const newTileSize = Math.floor(containerWidth / 4);
        setTileSize(newTileSize);
      }
    };

    // Initial calculation
    updateTileSize();
    
    // Update on window resize
    window.addEventListener('resize', updateTileSize);
    return () => window.removeEventListener('resize', updateTileSize);
  }, []);

  // Effect to load and set image dimensions when the image source changes
  useEffect(() => {
    const loadImageDimensions = async () => {
      try {
        const dimensions = await getImageDimensions(gameState.imageSrc);
        setImageDimensions(dimensions);
      } catch (error) {
        console.error('Error loading image dimensions:', error);
        // Fallback to default dimensions
        setImageDimensions({ width: 400, height: 400 });
      }
    };
    
    loadImageDimensions();
  }, [gameState.imageSrc]);

  // Handle mode change
  const handleModeChange = (mode: GameMode) => {
    if (mode === gameState.gameMode) return;
    
    // If changing to daily mode and it's already been completed, show message
    if (mode === 'daily' && hasDailyBeenCompleted()) {
      setTimeout(() => {
        alert("You've already completed today's puzzle! Try again tomorrow or play in infinite mode.");
      }, 0);
      return;
    }
    
    changeGameMode(mode);
    resetTimer();
    setIsWinModalOpen(false);
    setHasUserDismissedWinModal(false);
  };

  // Handle image selection for infinite/impossible modes
  const handleImageSelect = (imageSrc: string) => {
    changeImage(imageSrc);
    setIsImageSelectOpen(false);
    resetGame();
    resetTimer();
  };

  // Handle playing infinite mode after completing daily
  const handlePlayInfinite = () => {
    handleModeChange('infinite');
  };

  // Handle starting a new game (used in infinite/impossible modes)
  const handleNewGame = () => {
    resetGame();
    resetTimer();
    setIsWinModalOpen(false);
    setHasUserDismissedWinModal(false);
  };

  // Handle pause overlay click (to resume)
  const handlePauseOverlayClick = () => {
    if (gameState.isPaused) {
      togglePause();
    }
  };

  // Handle closing the win modal
  const handleCloseWinModal = () => {
    setIsWinModalOpen(false);
    setHasUserDismissedWinModal(true);
  };

  // Toggle preview modal
  const togglePreviewModal = () => {
    setIsPreviewModalOpen(!isPreviewModalOpen);
  };

  // Format time helper function
  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.container}>
      <Navbar
        gameMode={gameState.gameMode}
        onModeChange={handleModeChange}
        onRulesClick={() => setIsRulesOpen(true)}
      />
      
      <main className={styles.main}>
        <div className={styles.gameContent}>
          {/* Empty game controls container since we moved the controls to the board wrapper */}
        </div>
        
        {/* Board container is separate to allow for precise centering */}
        <div className={styles.boardWrapper}>
          <div className={styles.gameControls}>
            <div className={styles.timerAndMoves}>
              <div 
                className={`
                  ${styles.timer} 
                  ${timerState.isRunning ? styles.running : ''} 
                  ${gameState.isPaused ? styles.paused : ''}
                `}
                onClick={togglePause}
              >
                {gameState.isPaused ? (
                  <span className={styles.pauseIcon}>⏵</span>
                ) : timerState.isRunning ? (
                  <span className={styles.pauseIcon}>⏸</span>
                ) : null}
                <span className={styles.timeDisplay}>{formatTime(timerState.elapsedTime)}</span>
              </div>
              
              <div className={styles.movesCounter}>
                <span>{gameState.moves + " moves"}</span>
              </div>
            </div>
          </div>

          <div className={styles.boardContainer} ref={boardContainerRef}>
            <Board
              tiles={gameState.tiles}
              onTileClick={handleTileClick}
              isComplete={gameState.isComplete}
              isPaused={gameState.isPaused}
              onWinAnimationComplete={handleWinAnimationComplete}
              imageSrc={gameState.imageSrc}
              tileSize={tileSize}
              imageWidth={imageDimensions.width}
              imageHeight={imageDimensions.height}
            />
            
            {gameState.isPaused && (
              <div className={styles.pauseOverlay} onClick={handlePauseOverlayClick}>
                <div className={styles.pauseMessage}>
                  <span className={styles.pauseIcon}>⏵</span>
                  <span>PAUSED</span>
                  <p className={styles.pauseInstructions}>Tap to resume</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Control buttons below the board */}
        <div className={styles.belowBoardControls}>
          {/* Preview button */}
          <button 
            className={styles.previewButton}
            onClick={togglePreviewModal}
            title="Show Preview"
          >
            <span className={styles.previewIcon}>👁️</span>
          </button>
          
          {(gameState.gameMode === 'infinite' || gameState.gameMode === 'impossible') && (
            <>
              <button 
                className={styles.imageButton}
                onClick={() => setIsImageSelectOpen(true)}
                title="Change Image"
              >
                <span className={styles.imageIcon}>🖼️</span>
              </button>
              
              <button 
                className={styles.resetButton}
                onClick={handleNewGame}
                title="New Puzzle"
              >
                <span className={styles.resetIcon}>↻</span>
              </button>
            </>
          )}
        </div>
      </main>
      
      <Rules
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />
      
      <EndGameModal
        isOpen={isWinModalOpen}
        onClose={handleCloseWinModal}
        time={timerState.elapsedTime}
        moves={gameState.moves}
        date={gameState.date}
        onPlayInfinite={handlePlayInfinite}
        onShare={() => {}}
        onNewGame={handleNewGame}
        gameMode={gameState.gameMode}
        imageSrc={gameState.imageSrc}
      />
      
      {(gameState.gameMode === 'infinite' || gameState.gameMode === 'impossible') && (
        <ImageSelect
          isOpen={isImageSelectOpen}
          onClose={() => setIsImageSelectOpen(false)}
          onSelectImage={handleImageSelect}
          currentImage={gameState.imageSrc}
        />
      )}
      
      {/* New Preview Modal */}
      <PreviewModal
        isOpen={isPreviewModalOpen}
        onClose={togglePreviewModal}
        imageSrc={gameState.imageSrc}
        isImpossibleMode={gameState.gameMode === 'impossible'}
      />
    </div>
  );
};

export default PicturePuzzle;