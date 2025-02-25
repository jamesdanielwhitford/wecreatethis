import React from 'react';
import styles from './Sidebar.module.css';
import { View, FolderMetadata } from '../types';
import { FolderManager } from './FolderManager';

interface SidebarProps {
  allTags: string[];
  rootFolders: FolderMetadata[];
  folderTags: string[];
  onSelectFolder: (tag: string) => void;
  onBackToNotes: () => void;
  onCreateFolder: (folderName: string) => void;
  currentView: View;
  currentFolder: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  allTags, 
  rootFolders,
  folderTags,
  onSelectFolder, 
  onBackToNotes,
  onCreateFolder,
  currentView,
  currentFolder
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
        
        <FolderManager 
          availableTags={allTags}
          existingFolderTags={folderTags}
          onCreateFolder={onCreateFolder}
        />
        
        {rootFolders.length > 0 ? (
          <ul className={styles.folderList}>
            {rootFolders.map(folder => (
              <li key={folder.id} className={styles.folder}>
                <button 
                  className={`${styles.folderButton} ${currentFolder === folder.tag ? styles.active : ''}`}
                  onClick={() => onSelectFolder(folder.tag)}
                >
                  {folder.name}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyState}>
            No folders yet. Create a folder to organize your notes by tags.
          </p>
        )}
      </div>
    </div>
  );
};