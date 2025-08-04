import { useState } from 'react';
import styles from './styles.module.css';

interface PhotoGalleryProps {
  photos: string[];
  title?: string;
}

export default function PhotoGallery({ photos, title }: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!photos || photos.length === 0) {
    return null;
  }

  const openLightbox = (photo: string, index: number) => {
    setSelectedPhoto(photo);
    setCurrentIndex(index);
  };

  const closeLightbox = () => {
    setSelectedPhoto(null);
  };

  const navigatePhoto = (direction: 'prev' | 'next') => {
    let newIndex = currentIndex;
    
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : photos.length - 1;
    } else {
      newIndex = currentIndex < photos.length - 1 ? currentIndex + 1 : 0;
    }
    
    setCurrentIndex(newIndex);
    setSelectedPhoto(photos[newIndex]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeLightbox();
    } else if (e.key === 'ArrowLeft') {
      navigatePhoto('prev');
    } else if (e.key === 'ArrowRight') {
      navigatePhoto('next');
    }
  };

  return (
    <div className={styles.container}>
      {title && <h4 className={styles.title}>{title}</h4>}
      
      <div className={styles.photoGrid}>
        {photos.map((photo, index) => (
          <div
            key={index}
            className={styles.photoItem}
            onClick={() => openLightbox(photo, index)}
          >
            <img
              src={photo}
              alt={`Photo ${index + 1}`}
              className={styles.thumbnail}
            />
            <div className={styles.overlay}>
              <span className={styles.zoomIcon}>🔍</span>
            </div>
          </div>
        ))}
      </div>

      {selectedPhoto && (
        <div
          className={styles.lightbox}
          onClick={closeLightbox}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.closeButton}
              onClick={closeLightbox}
              aria-label="Close"
            >
              ×
            </button>

            {photos.length > 1 && (
              <>
                <button
                  className={`${styles.navButton} ${styles.prevButton}`}
                  onClick={() => navigatePhoto('prev')}
                  aria-label="Previous photo"
                >
                  ‹
                </button>
                <button
                  className={`${styles.navButton} ${styles.nextButton}`}
                  onClick={() => navigatePhoto('next')}
                  aria-label="Next photo"
                >
                  ›
                </button>
              </>
            )}

            <img
              src={selectedPhoto}
              alt={`Photo ${currentIndex + 1}`}
              className={styles.lightboxImage}
            />

            {photos.length > 1 && (
              <div className={styles.photoCounter}>
                {currentIndex + 1} / {photos.length}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}