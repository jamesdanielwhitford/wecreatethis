import React, { useState } from 'react';
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
  // State to track expanded/collapsed folders
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  
  // Filter out folders that have a parent (subfolders)
  const topLevelFolders = rootFolders.filter(folder => folder.parentId === null);
  
  // Build a map of parent ID to their child folders
  const foldersByParent: Record<string, FolderMetadata[]> = {};
  rootFolders.forEach(folder => {
    if (folder.parentId) {
      if (!foldersByParent[folder.parentId]) {
        foldersByParent[folder.parentId] = [];
      }
      foldersByParent[folder.parentId].push(folder);
    }
  });
  
  // Toggle folder expansion
  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  // Recursive component to render a folder and its children
  const FolderItem = ({ folder }: { folder: FolderMetadata }) => {
    const hasChildren = foldersByParent[folder.id] && foldersByParent[folder.id].length > 0;
    const isExpanded = expandedFolders[folder.id] || false;
    
    return (
      <li className={styles.folder}>
        <div className={styles.folderRow}>
          {hasChildren && (
            <button 
              className={`${styles.expandButton} ${isExpanded ? styles.expanded : ''}`}
              onClick={() => toggleFolder(folder.id)}
              aria-label={isExpanded ? "Collapse folder" : "Expand folder"}
            >
              {isExpanded ? '▼' : '►'}
            </button>
          )}
          <button 
            className={`${styles.folderButton} ${currentFolder === folder.tag ? styles.active : ''}`}
            onClick={() => onSelectFolder(folder.tag)}
          >
            {folder.name}
          </button>
        </div>
        
        {hasChildren && isExpanded && (
          <ul className={styles.nestedFolderList}>
            {foldersByParent[folder.id].map(childFolder => (
              <FolderItem key={childFolder.id} folder={childFolder} />
            ))}
          </ul>
        )}
      </li>
    );
  };
  
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
        
        {topLevelFolders.length > 0 ? (
          <ul className={styles.folderList}>
            {topLevelFolders.map(folder => (
              <FolderItem key={folder.id} folder={folder} />
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