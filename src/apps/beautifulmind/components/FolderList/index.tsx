// src/apps/beautifulmind/components/FolderList/index.tsx

import React, { useState } from 'react';
import { Folder, FolderHierarchy } from '../../types/notes.types';
import FolderTree from '../FolderTree';
import { buildFolderTree } from '../../utils/folder-hierarchy';
import styles from './styles.module.css';

interface FolderListProps {
  folders: Folder[];
  onFolderClick: (folder: Folder) => void;
  onFolderDelete?: (id: string) => void;
  onCreateSubfolder?: (parentId: string) => void;
}

const FolderList: React.FC<FolderListProps> = ({ folders, onFolderClick, onFolderDelete, onCreateSubfolder }) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Build folder tree from flat array
  const folderTree = buildFolderTree(folders);

  const handleToggleExpand = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const handleFolderDelete = async (folderId: string) => {
    if (onFolderDelete) {
      await onFolderDelete(folderId);
    }
  };

  if (folderTree.length === 0) {
    return (
      <div className={styles.emptyState}>
        <h3>No folders yet</h3>
        <p>Create your first semantic folder to organize notes by topic!</p>
      </div>
    );
  }

  return (
    <div className={styles.folderList}>
      <FolderTree
        folderTree={folderTree}
        onFolderClick={onFolderClick}
        onFolderDelete={handleFolderDelete}
        onCreateSubfolder={onCreateSubfolder}
        expandedFolders={expandedFolders}
        onToggleExpand={handleToggleExpand}
        showActions={true}
      />
    </div>
  );
};

export default FolderList;