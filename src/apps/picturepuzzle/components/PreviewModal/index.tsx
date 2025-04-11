// src/apps/picturepuzzle/components/PreviewModal/index.tsx

import React from 'react';
import styles from './styles.module.css';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  isImpossibleMode?: boolean;
}

const PreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  isImpossibleMode = false
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2 className={styles.modalTitle}>Preview Image</h2>
        
        <div className={styles.previewContainer}>
          <div className={styles.previewImage}>
            <img 
              src={imageSrc} 
              alt="Puzzle preview" 
              className={styles.previewImg}
            />
          </div>
          
          {isImpossibleMode && (
            <div className={styles.impossibleLabel}>
              <span role="img" aria-label="Skull">💀</span> Impossible Mode <span role="img" aria-label="Skull">💀</span>
            </div>
          )}
        </div>
        
        <button className={styles.closeButton} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default PreviewModal;