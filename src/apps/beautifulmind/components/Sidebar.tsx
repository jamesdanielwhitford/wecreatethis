import React from 'react';
import styles from './Sidebar.module.css';
import { View } from '../types';

interface SidebarProps {
  tags: string[];
  onSelectFolder: (tag: string) => void;
  onBackToNotes: () => void;
  currentView: View;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  tags, 
  onSelectFolder, 
  onBackToNotes,
  currentView
}) => {
  return (
    <div className={styles.sidebar}>
      <div className={styles.navigation}>
        <button 
          className={`${styles.navigationItem} ${currentView === 'notes' ? styles.active : ''}`}
          onClick={onBackToNotes}
        >
          All Notes
        </button>
      </div>
      
      <div className={styles.folderSection}>
        <h3 className={styles.sectionTitle}>Folders</h3>
        {tags.length > 0 ? (
          <ul className={styles.folderList}>
            {tags.map(tag => (
              <li key={tag} className={styles.folder}>
                <button 
                  className={styles.folderButton}
                  onClick={() => onSelectFolder(tag)}
                >
                  {tag}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyState}>
            No folders yet. Add tags to notes to create folders.
          </p>
        )}
      </div>
    </div>
  );
};