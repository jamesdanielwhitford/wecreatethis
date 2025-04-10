// src/apps/picturepuzzle/components/ImageSelect/index.tsx

import React from 'react';
import styles from './styles.module.css';

interface ImageSelectProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  onSelectImage: (imageSrc: string) => void;
  currentImage: string;
}

const ImageSelect: React.FC<ImageSelectProps> = ({
  isOpen,
  onClose,
  images,
  onSelectImage,
  currentImage
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2 className={styles.modalTitle}>Select an Image</h2>
        
        <div className={styles.imagesGrid}>
          {images.map((imageSrc, index) => (
            <div 
              key={index}
              className={`${styles.imageItem} ${imageSrc === currentImage ? styles.selected : ''}`}
              onClick={() => onSelectImage(imageSrc)}
            >
              <div 
                className={styles.imageThumb}
                style={{
                  backgroundImage: `url(${imageSrc})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
              {imageSrc === currentImage && (
                <div className={styles.currentIndicator}>Current</div>
              )}
            </div>
          ))}
        </div>
        
        <button className={styles.closeButton} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default ImageSelect;