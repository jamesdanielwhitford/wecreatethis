// src/apps/beautifulmind/components/Navbar/index.tsx

import React from 'react';
import { ViewMode } from '../../types/notes.types';
import styles from './styles.module.css';

interface NavbarProps {
  viewMode: ViewMode;
  onNewNote: () => void;
  onBackToList: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ viewMode, onNewNote, onBackToList }) => {
  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <h1 className={styles.title}>Beautiful Mind</h1>
        <div className={styles.actions}>
          {viewMode === 'list' ? (
            <button className={styles.newButton} onClick={onNewNote}>
              + New Note
            </button>
          ) : (
            <button className={styles.backButton} onClick={onBackToList}>
              ← Back to Notes
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;