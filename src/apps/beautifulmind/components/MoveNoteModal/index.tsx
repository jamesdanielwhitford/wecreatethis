/**
 * File: src/apps/beautifulmind/components/MoveNoteModal/index.tsx
 * Modal for moving notes between folders
 */

'use client';

import React, { useState, useEffect } from 'react';
import styles from './styles.module.css';
import { Folder, FolderTreeItem } from '../../types';
import { getUserFolderTree, moveNotesToFolder } from '../../utils';

interface MoveNoteModalProps {
  userId: string;
  noteIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export const MoveNoteModal: React.FC<MoveNoteModalProps> = ({
  userId,
  noteIds,
  onClose,
  onSuccess
}) => {
  const [folderTree, setFolderTree] = useState<FolderTreeItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState<boolean>(false);

  // Load folder tree on component mount
  useEffect(() => {
    const loadFolderTree = async () => {
      try {
        setIsLoading(true);
        const folders = await getUserFolderTree(userId);
        setFolderTree(folders);
      } catch (err) {
        console.error('Error loading folders:', err);
        setError('Failed to load folders. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadFolderTree();
  }, [userId]);

  // Toggle folder expansion
  const toggleFolder = (folderId: string) => {
    const newExpandedFolders = new Set(expandedFolders);
    
    if (newExpandedFolders.has(folderId)) {
      newExpandedFolders.delete(folderId);
    } else {
      newExpandedFolders.add(folderId);
    }
    
    setExpandedFolders(newExpandedFolders);
  };

  // Select a folder
  const selectFolder = (folderId: string | null) => {
    setSelectedFolderId(folderId);
  };

  // Handle note move
  const handleMoveNotes = async () => {
    if (selectedFolderId === null) {
      setError('Please select a destination folder');
      return;
    }

    try {
      setIsMoving(true);
      setError(null);
      
      await moveNotesToFolder(noteIds, selectedFolderId, userId);
      
      onSuccess();
    } catch (err) {
      console.error('Error moving notes:', err);
      setError('Failed to move notes. Please try again.');
    } finally {
      setIsMoving(false);
    }
  };

  // Recursive function to render folder tree
  const renderFolderItem = (folder: FolderTreeItem, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    
    return (
      <li key={folder.id} className={styles.folderItem}>
        <div 
          className={`${styles.folderRow} ${isSelected ? styles.selectedFolder : ''}`}
          onClick={() => selectFolder(folder.id)}
          style={{ paddingLeft: `${level * 16 + 16}px` }}
        >
          {folder.children.length > 0 && (
            <span 
              className={`${styles.folderIcon} ${isExpanded ? styles.expanded : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder.id);
              }}
            >
              ▶
            </span>
          )}
          {folder.children.length === 0 && (
            <span className={styles.emptyFolderIcon}>•</span>
          )}
          <span className={styles.folderName}>{folder.name}</span>
        </div>
        
        {isExpanded && folder.children.length > 0 && (
          <ul className={styles.nestedList}>
            {folder.children.map(child => renderFolderItem(child, level + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            Move {noteIds.length > 1 ? `${noteIds.length} Notes` : 'Note'} to Folder
          </h3>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div className={styles.modalContent}>
          {isLoading ? (
            <div className={styles.loading}>Loading folders...</div>
          ) : (
            <>
              <p className={styles.instruction}>
                Select a destination folder:
              </p>
              
              <div className={styles.folderTreeContainer}>
                <div 
                  className={`${styles.folderRow} ${selectedFolderId === null ? styles.selectedFolder : ''}`}
                  onClick={() => selectFolder(null)}
                >
                  <span className={styles.rootFolderIcon}>•</span>
                  <span className={styles.folderName}>Root (No Folder)</span>
                </div>
                
                {folderTree.length > 0 ? (
                  <ul className={styles.folderList}>
                    {folderTree.map(folder => renderFolderItem(folder))}
                  </ul>
                ) : (
                  <div className={styles.emptyState}>No folders available</div>
                )}
              </div>
            </>
          )}
          
          {error && <div className={styles.error}>{error}</div>}
        </div>
        
        <div className={styles.modalFooter}>
          <button 
            className={styles.cancelButton} 
            onClick={onClose}
            disabled={isMoving}
          >
            Cancel
          </button>
          <button 
            className={styles.moveButton} 
            onClick={handleMoveNotes}
            disabled={isLoading || isMoving}
          >
            {isMoving ? 'Moving...' : 'Move'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoveNoteModal;