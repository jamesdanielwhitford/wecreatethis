/**
 * File: src/apps/beautifulmind/components/FolderTree/index.tsx
 * Folder Tree component for navigating the folder hierarchy
 */

'use client';

import React, { useState, useEffect } from 'react';
import styles from './styles.module.css';
import { FolderTreeItem } from '../../types';
import { getUserFolderTree, createFolder } from '../../utils';

interface FolderTreeProps {
  userId: string;
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
}

export const FolderTree: React.FC<FolderTreeProps> = ({ 
  userId, 
  selectedFolderId, 
  onFolderSelect 
}) => {
  const [folderTree, setFolderTree] = useState<FolderTreeItem[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [addingToFolderId, setAddingToFolderId] = useState<string | null>(null);

  // Load folder tree on component mount
  useEffect(() => {
    const loadFolderTree = async () => {
      if (!userId) return;
      
      setIsLoading(true);
      try {
        const folders = await getUserFolderTree(userId);
        setFolderTree(folders);
      } catch (error) {
        console.error('Error loading folder tree:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFolderTree();
  }, [userId]);

  // Toggle folder expansion
  const toggleFolder = (folderId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const newExpandedFolders = new Set(expandedFolders);
    
    if (newExpandedFolders.has(folderId)) {
      newExpandedFolders.delete(folderId);
    } else {
      newExpandedFolders.add(folderId);
    }
    
    setExpandedFolders(newExpandedFolders);
  };

  // Handle selecting a folder
  const selectFolder = (folderId: string | null) => {
    onFolderSelect(folderId);
  };

  // Show new folder input form
  const showNewFolderForm = (parentId: string | null, event: React.MouseEvent) => {
    event.stopPropagation();
    setAddingToFolderId(parentId);
    setNewFolderName('');
  };

  // Create new folder
  const handleCreateFolder = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!newFolderName.trim()) return;
    
    try {
      // Determine parent folder path
      let path: string[] = [];
      
      if (addingToFolderId) {
        // Find the parent folder to get its path
        const findFolder = (folders: FolderTreeItem[], targetId: string): FolderTreeItem | null => {
          for (const folder of folders) {
            if (folder.id === targetId) return folder;
            
            const found = findFolder(folder.children, targetId);
            if (found) return found;
          }
          return null;
        };
        
        const parent = findFolder(folderTree, addingToFolderId);
        
        // If parent found, get its ancestors + itself for the path
        if (parent) {
          // In production, we'd fetch the full path from Firestore
          // Here we're using a placeholder as we don't have the full path in FolderTreeItem
          path = [addingToFolderId];
        }
      }
      
      // Create folder in Firestore
      await createFolder({
        name: newFolderName,
        parentId: addingToFolderId,
        path,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userId
      });
      
      // Refresh folder tree
      const updatedFolders = await getUserFolderTree(userId);
      setFolderTree(updatedFolders);
      
      // Add parent to expanded folders
      if (addingToFolderId) {
        setExpandedFolders(prev => new Set(prev).add(addingToFolderId));
      }
      
    } catch (error) {
      console.error('Error creating folder:', error);
    } finally {
      setAddingToFolderId(null);
      setNewFolderName('');
    }
  };

  // Cancel folder creation
  const cancelCreateFolder = (event: React.MouseEvent) => {
    event.stopPropagation();
    setAddingToFolderId(null);
    setNewFolderName('');
  };

  // Render folder item and its children recursively
  const renderFolderItem = (folder: FolderTreeItem, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    
    return (
      <li key={folder.id} className={styles.folderItem}>
        <div 
          className={`${styles.folderRow} ${isSelected ? styles.selectedFolder : ''}`}
          onClick={() => selectFolder(folder.id)}
          style={{ paddingLeft: `${level * 16}px` }}
        >
          <span 
            className={`${styles.folderIcon} ${isExpanded ? styles.expanded : ''}`}
            onClick={(e) => toggleFolder(folder.id, e)}
          >
            {folder.children.length > 0 ? '▶' : '•'}
          </span>
          <span className={styles.folderName}>{folder.name}</span>
          <button 
            className={styles.addButton}
            onClick={(e) => showNewFolderForm(folder.id, e)}
            title="Add Subfolder"
          >
            +
          </button>
        </div>
        
        {isExpanded && folder.children.length > 0 && (
          <ul className={styles.folderList}>
            {folder.children.map(child => renderFolderItem(child, level + 1))}
          </ul>
        )}
        
        {addingToFolderId === folder.id && (
          <form 
            className={styles.newFolderForm} 
            onSubmit={handleCreateFolder}
            style={{ paddingLeft: `${(level + 1) * 16}px` }}
          >
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="New folder name"
              className={styles.newFolderInput}
              autoFocus
              maxLength={50}
            />
            <div className={styles.formActions}>
              <button type="submit" className={styles.saveButton}>Save</button>
              <button 
                type="button" 
                className={styles.cancelButton}
                onClick={cancelCreateFolder}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </li>
    );
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading folders...</div>;
  }

  return (
    <div className={styles.folderTree}>
      <div className={styles.header}>
        <h3 className={styles.title}>Folders</h3>
        <button 
          className={styles.addRootButton} 
          onClick={(e) => showNewFolderForm(null, e)}
          title="Add Root Folder"
        >
          + New Folder
        </button>
      </div>
      
      <div 
        className={`${styles.folderRow} ${selectedFolderId === null ? styles.selectedFolder : ''}`}
        onClick={() => selectFolder(null)}
      >
        <span className={styles.folderIcon}>•</span>
        <span className={styles.folderName}>All Notes</span>
      </div>
      
      {folderTree.length > 0 ? (
        <ul className={styles.folderList}>
          {folderTree.map(folder => renderFolderItem(folder))}
        </ul>
      ) : (
        <div className={styles.emptyState}>No folders yet</div>
      )}
      
      {addingToFolderId === null && (
        <form 
          className={`${styles.newFolderForm} ${styles.rootFolderForm}`} 
          onSubmit={handleCreateFolder}
        >
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="New folder name"
            className={styles.newFolderInput}
            autoFocus
            maxLength={50}
          />
          <div className={styles.formActions}>
            <button type="submit" className={styles.saveButton}>Save</button>
            <button 
              type="button" 
              className={styles.cancelButton}
              onClick={cancelCreateFolder}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default FolderTree;