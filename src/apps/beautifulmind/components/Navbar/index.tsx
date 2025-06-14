// src/apps/beautifulmind/components/Navbar/index.tsx

import React from 'react';
import { ViewMode } from '../../types/notes.types';
import styles from './styles.module.css';

interface NavbarProps {
  viewMode: ViewMode;
  onNewNote: () => void;
  onNewFolder: () => void;
  onBackToList: () => void;
  onSwitchToNotes: () => void;
  onSwitchToFolders: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ 
  viewMode, 
  onNewNote, 
  onNewFolder, 
  onBackToList, 
  onSwitchToNotes, 
  onSwitchToFolders 
}) => {
  const isInFolder = viewMode.startsWith('folder');
  const isInNote = ['view', 'edit', 'create'].includes(viewMode);
  const showMainActions = viewMode === 'list' || viewMode === 'folders';

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <h1 className={styles.title}>Beautiful Mind</h1>
        
        <div className={styles.actions}>
          {showMainActions && (
            <div className={styles.viewToggle}>
              <button 
                className={`${styles.toggleButton} ${viewMode === 'list' ? styles.active : ''}`}
                onClick={onSwitchToNotes}
              >
                📝 Notes
              </button>
              <button 
                className={`${styles.toggleButton} ${viewMode === 'folders' ? styles.active : ''}`}
                onClick={onSwitchToFolders}
              >
                📁 Folders
              </button>
            </div>
          )}
          
          {viewMode === 'list' && (
            <button className={styles.newButton} onClick={onNewNote}>
              + New Note
            </button>
          )}
          
          {viewMode === 'folders' && (
            <button className={styles.newButton} onClick={onNewFolder}>
              + New Folder
            </button>
          )}
          
          {(isInNote || isInFolder) && (
            <button className={styles.backButton} onClick={onBackToList}>
              ← Back
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;