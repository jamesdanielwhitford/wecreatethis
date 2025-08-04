'use client';

import { useState } from 'react';
import BirdSearch from './components/BirdSearch';
import PersonalList from './components/PersonalList';
import PhotoIdentificationModal from './components/PhotoIdentificationModal';
import AddBirdModal from './components/AddBirdModal';
import AuthModal from './components/AuthModal';
import UserMenu from './components/UserMenu';
import { usePersonalList } from './hooks/usePersonalList';
import { Bird } from './types/bird.types';
import styles from './BirdWatch.module.css';

export default function BirdWatchPage() {
  const [activeTab, setActiveTab] = useState<'search' | 'mylist'>('search');
  const [showPhotoIdentification, setShowPhotoIdentification] = useState(false);
  const [showAddBirdModal, setShowAddBirdModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedBird, setSelectedBird] = useState<Bird | null>(null);
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
  const [pendingLocation, setPendingLocation] = useState<string>();
  
  const { addBird, syncing, isConfigured } = usePersonalList();

  const handlePhotoIdentification = (bird: Bird, photos: string[], location?: string) => {
    setSelectedBird(bird);
    setPendingPhotos(photos);
    setPendingLocation(location);
    setShowAddBirdModal(true);
  };

  const handleAddBird = (bird: Bird, location?: string, notes?: string, photos?: string[]) => {
    const finalPhotos = photos || pendingPhotos;
    const finalLocation = location || pendingLocation;
    
    addBird(bird, finalLocation, notes, finalPhotos);
    
    // Reset state
    setShowAddBirdModal(false);
    setSelectedBird(null);
    setPendingPhotos([]);
    setPendingLocation(undefined);
  };

  const handleBirdChange = (newBird: Bird) => {
    setSelectedBird(newBird);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.title}>BirdWatch</h1>
            <p className={styles.subtitle}>
              Discover and track the birds around you
              {syncing && <span className={styles.syncingIndicator}>⚡ Syncing...</span>}
            </p>
          </div>
          
          {isConfigured && (
            <UserMenu onSignInClick={() => setShowAuthModal(true)} />
          )}
        </div>
        
        <nav className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'search' ? styles.active : ''}`}
            onClick={() => setActiveTab('search')}
          >
            Search Birds
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'mylist' ? styles.active : ''}`}
            onClick={() => setActiveTab('mylist')}
          >
            My Bird List
          </button>
          <button
            className={styles.photoButton}
            onClick={() => setShowPhotoIdentification(true)}
          >
            📷 ID from Photo
          </button>
        </nav>
      </header>

      <main className={styles.main}>
        {activeTab === 'search' && (
          <div className={styles.tabContent}>
            <BirdSearch />
          </div>
        )}
        
        {activeTab === 'mylist' && (
          <div className={styles.tabContent}>
            <PersonalList />
          </div>
        )}
      </main>

      <PhotoIdentificationModal
        isOpen={showPhotoIdentification}
        onClose={() => setShowPhotoIdentification(false)}
        onBirdIdentified={handlePhotoIdentification}
      />

      <AddBirdModal
        bird={selectedBird || undefined}
        isOpen={showAddBirdModal}
        onClose={() => {
          setShowAddBirdModal(false);
          setSelectedBird(null);
          setPendingPhotos([]);
          setPendingLocation(undefined);
        }}
        onAdd={handleAddBird}
        onBirdChange={handleBirdChange}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}