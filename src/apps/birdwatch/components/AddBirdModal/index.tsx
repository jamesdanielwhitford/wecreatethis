import { useState } from 'react';
import { Bird } from '../../types/bird.types';
import { getBirdImageUrl } from '../../utils/inaturalist-api';
import PhotoUpload from '../PhotoUpload';
import AIIdentification from '../AIIdentification';
import styles from './styles.module.css';

interface AddBirdModalProps {
  bird?: Bird;
  isOpen: boolean;
  onClose: () => void;
  onAdd: (bird: Bird, location?: string, notes?: string, photos?: string[]) => void;
  onBirdChange?: (bird: Bird) => void;
}

export default function AddBirdModal({ bird, isOpen, onClose, onAdd, onBirdChange }: AddBirdModalProps) {
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bird) return;
    
    setIsSubmitting(true);
    
    try {
      onAdd(bird, location.trim() || undefined, notes.trim() || undefined, photos);
      onClose();
      setLocation('');
      setNotes('');
      setPhotos([]);
    } catch (error) {
      console.error('Error adding bird:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setLocation('');
      setNotes('');
      setPhotos([]);
    }
  };

  if (!isOpen) return null;

  const imageUrl = bird ? getBirdImageUrl(bird) : null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {bird ? 'Add Bird to Your List' : 'Add Bird Sighting'}
          </h2>
          <button 
            onClick={handleClose} 
            className={styles.closeButton}
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>

        {bird && (
          <div className={styles.birdInfo}>
            {imageUrl && (
              <img 
                src={imageUrl} 
                alt={bird.preferred_common_name || bird.name}
                className={styles.birdImage}
              />
            )}
            
            <div className={styles.birdDetails}>
              <h3 className={styles.commonName}>
                {bird.preferred_common_name || bird.name}
              </h3>
              <p className={styles.scientificName}>
                {bird.name}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="location" className={styles.label}>
              Location (optional)
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Where did you spot this bird?"
              className={styles.input}
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="notes" className={styles.label}>
              Notes (optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any interesting observations or behaviors?"
              className={styles.textarea}
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <PhotoUpload
            onPhotosUploaded={setPhotos}
            maxPhotos={3}
            existingPhotos={photos}
          />

          {photos.length > 0 && !bird && (
            <AIIdentification
              photo={photos[0]}
              location={location}
              onBirdSuggested={(suggestedBird) => {
                onBirdChange?.(suggestedBird);
              }}
              onSearchSuggested={(searchTerm) => {
                // Could trigger a search in the parent component
                console.log('Search suggested:', searchTerm);
              }}
            />
          )}

          <div className={styles.actions}>
            <button 
              type="button" 
              onClick={handleClose}
              className={styles.cancelButton}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit"
              className={styles.addButton}
              disabled={isSubmitting || !bird}
            >
              {isSubmitting ? 'Adding...' : 'Add to My List'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}