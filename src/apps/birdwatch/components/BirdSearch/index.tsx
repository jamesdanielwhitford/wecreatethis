import { useState, useEffect } from 'react';
import { useBirdSearch } from '../../hooks/useBirdSearch';
import { usePersonalList } from '../../hooks/usePersonalList';
import { getBirdImageUrl } from '../../utils/inaturalist-api';
import AddBirdModal from '../AddBirdModal';
import { Bird } from '../../types/bird.types';
import styles from './styles.module.css';

interface BirdSearchProps {
  onBirdSelect?: (bird: Bird) => void;
}

export default function BirdSearch({ onBirdSelect }: BirdSearchProps) {
  const { birds, loading, error, filters, search, updateFilters } = useBirdSearch();
  const { addBird, hasBird } = usePersonalList();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBird, setSelectedBird] = useState<Bird | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    search(searchQuery, filters.southAfricaOnly);
  };

  const handleSouthAfricaToggle = (checked: boolean) => {
    updateFilters({ southAfricaOnly: checked });
    if (searchQuery) {
      search(searchQuery, checked);
    }
  };

  const handleBirdSelect = (bird: Bird) => {
    if (onBirdSelect) {
      onBirdSelect(bird);
    } else {
      setSelectedBird(bird);
      setShowAddModal(true);
    }
  };

  const handleAddBird = (bird: Bird, location?: string, notes?: string, photos?: string[]) => {
    addBird(bird, location, notes, photos);
    setShowAddModal(false);
    setSelectedBird(null);
  };

  return (
    <div className={styles.container}>
      <form onSubmit={handleSearch} className={styles.searchForm}>
        <div className={styles.searchInput}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for birds (e.g., robin, eagle, sparrow)"
            className={styles.input}
          />
          <button type="submit" disabled={loading} className={styles.searchButton}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
        
        <div className={styles.filters}>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={filters.southAfricaOnly}
              onChange={(e) => handleSouthAfricaToggle(e.target.checked)}
            />
            South Africa only
          </label>
        </div>
      </form>

      {error && (
        <div className={styles.error}>
          Error: {error}
        </div>
      )}

      {birds.length > 0 && (
        <div className={styles.results}>
          <h3 className={styles.resultsTitle}>
            Found {birds.length} bird{birds.length !== 1 ? 's' : ''}
          </h3>
          
          <div className={styles.birdGrid}>
            {birds.map((bird) => {
              const imageUrl = getBirdImageUrl(bird);
              return (
                <div key={bird.id} className={styles.birdCard}>
                  {imageUrl && (
                    <img 
                      src={imageUrl} 
                      alt={bird.preferred_common_name || bird.name}
                      className={styles.birdImage}
                    />
                  )}
                  
                  <div className={styles.birdInfo}>
                    <h4 className={styles.commonName}>
                      {bird.preferred_common_name || bird.name}
                    </h4>
                    <p className={styles.scientificName}>
                      {bird.name}
                    </p>
                    
                    <button 
                      onClick={() => handleBirdSelect(bird)}
                      className={`${styles.addButton} ${hasBird(bird.id) ? styles.alreadyAdded : ''}`}
                      disabled={hasBird(bird.id)}
                    >
                      {hasBird(bird.id) ? 'Already in List ✓' : 'Add to My List'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && searchQuery && birds.length === 0 && !error && (
        <div className={styles.noResults}>
          No birds found for "{searchQuery}". Try a different search term.
        </div>
      )}

      {selectedBird && (
        <AddBirdModal
          bird={selectedBird}
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setSelectedBird(null);
          }}
          onAdd={handleAddBird}
        />
      )}
    </div>
  );
}