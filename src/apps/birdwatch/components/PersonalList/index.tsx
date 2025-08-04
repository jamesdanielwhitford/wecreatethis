import { useState } from 'react';
import { usePersonalList } from '../../hooks/usePersonalList';
import { getBirdImageUrl } from '../../utils/inaturalist-api';
import { PersonalBirdEntry } from '../../types/bird.types';
import PhotoGallery from '../PhotoGallery';
import styles from './styles.module.css';

interface PersonalListProps {
  onEditEntry?: (entry: PersonalBirdEntry) => void;
}

export default function PersonalList({ onEditEntry }: PersonalListProps) {
  const { 
    personalBirds, 
    loading, 
    removeBird, 
    getBirdsByOrder, 
    getBirdCount, 
    getUniqueSpeciesCount 
  } = usePersonalList();
  
  const [sortOrder, setSortOrder] = useState<'chronological' | 'alphabetical'>('chronological');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const sortedBirds = getBirdsByOrder(sortOrder);

  const handleDelete = (entryId: string) => {
    removeBird(entryId);
    setShowDeleteConfirm(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        Loading your bird list...
      </div>
    );
  }

  if (personalBirds.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>🐦</div>
        <h3>No birds in your list yet</h3>
        <p>Start by searching for birds and adding them to your personal collection!</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statNumber}>{getBirdCount()}</span>
            <span className={styles.statLabel}>Total Sightings</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNumber}>{getUniqueSpeciesCount()}</span>
            <span className={styles.statLabel}>Unique Species</span>
          </div>
        </div>

        <div className={styles.controls}>
          <label className={styles.sortLabel}>
            Sort by:
            <select 
              value={sortOrder} 
              onChange={(e) => setSortOrder(e.target.value as 'chronological' | 'alphabetical')}
              className={styles.sortSelect}
            >
              <option value="chronological">Date Added (Recent First)</option>
              <option value="alphabetical">Species Name (A-Z)</option>
            </select>
          </label>
        </div>
      </div>

      <div className={styles.birdList}>
        {sortedBirds.map((entry) => {
          const imageUrl = getBirdImageUrl(entry.bird);
          return (
            <div key={entry.id} className={styles.birdEntry}>
              {imageUrl && (
                <img 
                  src={imageUrl} 
                  alt={entry.bird.preferred_common_name || entry.bird.name}
                  className={styles.birdImage}
                />
              )}
              
              <div className={styles.birdInfo}>
                <div className={styles.birdNames}>
                  <h4 className={styles.commonName}>
                    {entry.bird.preferred_common_name || entry.bird.name}
                  </h4>
                  <p className={styles.scientificName}>
                    {entry.bird.name}
                  </p>
                </div>

                <div className={styles.entryDetails}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Spotted:</span>
                    <span className={styles.detailValue}>{formatDate(entry.dateSpotted)}</span>
                  </div>
                  
                  {entry.location && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Location:</span>
                      <span className={styles.detailValue}>{entry.location}</span>
                    </div>
                  )}
                  
                  {entry.notes && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Notes:</span>
                      <span className={styles.detailValue}>{entry.notes}</span>
                    </div>
                  )}
                </div>

                {entry.photos && entry.photos.length > 0 && (
                  <PhotoGallery 
                    photos={entry.photos} 
                    title={`${entry.photos.length} Photo${entry.photos.length !== 1 ? 's' : ''}`}
                  />
                )}
              </div>

              <div className={styles.actions}>
                {onEditEntry && (
                  <button 
                    onClick={() => onEditEntry(entry)}
                    className={styles.editButton}
                    title="Edit entry"
                  >
                    ✏️
                  </button>
                )}
                
                <button 
                  onClick={() => setShowDeleteConfirm(entry.id)}
                  className={styles.deleteButton}
                  title="Delete entry"
                >
                  🗑️
                </button>
              </div>

              {showDeleteConfirm === entry.id && (
                <div className={styles.deleteConfirm}>
                  <p>Delete this bird entry?</p>
                  <div className={styles.confirmButtons}>
                    <button 
                      onClick={() => handleDelete(entry.id)}
                      className={styles.confirmDelete}
                    >
                      Yes, Delete
                    </button>
                    <button 
                      onClick={() => setShowDeleteConfirm(null)}
                      className={styles.cancelDelete}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}