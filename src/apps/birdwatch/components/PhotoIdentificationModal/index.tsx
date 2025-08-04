import { useState } from 'react';
import { Bird } from '../../types/bird.types';
import PhotoUpload from '../PhotoUpload';
import AIIdentification from '../AIIdentification';
import styles from './styles.module.css';

interface PhotoIdentificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBirdIdentified: (bird: Bird, photos: string[], location?: string) => void;
}

export default function PhotoIdentificationModal({
  isOpen,
  onClose,
  onBirdIdentified
}: PhotoIdentificationModalProps) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [selectedBird, setSelectedBird] = useState<Bird | null>(null);

  const handleClose = () => {
    onClose();
    setPhotos([]);
    setLocation('');
    setSelectedBird(null);
  };

  const handleBirdSelect = (bird: Bird) => {
    setSelectedBird(bird);
    onBirdIdentified(bird, photos, location.trim() || undefined);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>📷 Identify Bird from Photo</h2>
          <button 
            onClick={handleClose} 
            className={styles.closeButton}
          >
            ×
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.instructions}>
            <p>Upload a photo of a bird and our AI will help identify the species for you!</p>
          </div>

          <div className={styles.field}>
            <label htmlFor="location" className={styles.label}>
              Location (optional)
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Where did you take this photo?"
              className={styles.input}
            />
          </div>

          <PhotoUpload
            onPhotosUploaded={setPhotos}
            maxPhotos={1}
            existingPhotos={photos}
          />

          {photos.length > 0 && (
            <AIIdentification
              photo={photos[0]}
              location={location}
              onBirdSuggested={handleBirdSelect}
              onSearchSuggested={(searchTerm) => {
                console.log('Search suggested:', searchTerm);
                // Could implement search functionality here
              }}
            />
          )}

          {photos.length === 0 && (
            <div className={styles.placeholder}>
              <div className={styles.placeholderIcon}>📸</div>
              <p>Upload a photo to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}