// src/apps/beautifulmind/components/FolderPicker/index.tsx

import React, { useState, useEffect } from 'react';
import { FolderHierarchy, Folder } from '../../types/notes.types';
import { buildFolderTree } from '../../utils/folder-hierarchy';
import styles from './styles.module.css';

interface FolderPickerProps {
  folders: Folder[];
  selectedFolderIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onClose: () => void;
  mode: 'move' | 'add'; // move = single selection, add = multiple selection
  title?: string;
  confirmText?: string;
  currentFolderId?: string; // exclude this folder from selection (when moving)
}

interface FolderPickerNodeProps {
  folder: FolderHierarchy;
  selectedFolderIds: string[];
  onToggleSelection: (folderId: string) => void;
  mode: 'move' | 'add';
  isExpanded: boolean;
  onToggleExpand: (folderId: string) => void;
  currentFolderId?: string;
}

const FolderPickerNode: React.FC<FolderPickerNodeProps> = ({
  folder,
  selectedFolderIds,
  onToggleSelection,
  mode,
  isExpanded,
  onToggleExpand,
  currentFolderId
}) => {
  const hasChildren = folder.children && folder.children.length > 0;
  const isSelected = selectedFolderIds.includes(folder.id);
  const isCurrentFolder = currentFolderId === folder.id;
  const isDisabled = isCurrentFolder;
  
  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand(folder.id);
  };
  
  const handleToggleSelection = () => {
    if (!isDisabled) {
      onToggleSelection(folder.id);
    }
  };
  
  return (
    <div className={styles.folderNode}>
      <div 
        className={`${styles.folderItem} ${isSelected ? styles.selected : ''} ${isDisabled ? styles.disabled : ''}`}
        onClick={handleToggleSelection}
        style={{ paddingLeft: `${folder.depth * 16 + 8}px` }}
      >
        <div className={styles.folderContent}>
          {hasChildren && (
            <button 
              className={`${styles.expandButton} ${isExpanded ? styles.expanded : ''}`}
              onClick={handleToggleExpand}
              type="button"
            >
              ▶
            </button>
          )}
          
          <div className={styles.selectionControl}>
            {mode === 'add' ? (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={handleToggleSelection}
                disabled={isDisabled}
                className={styles.checkbox}
              />
            ) : (
              <input
                type="radio"
                checked={isSelected}
                onChange={handleToggleSelection}
                disabled={isDisabled}
                className={styles.radio}
                name="folderSelection"
              />
            )}
          </div>
          
          <div className={styles.folderIcon}>📁</div>
          
          <div className={styles.folderInfo}>
            <span className={styles.folderTitle}>
              {folder.title}
              {isCurrentFolder && <span className={styles.currentIndicator}> (current)</span>}
            </span>
            {folder.description && (
              <span className={styles.folderDescription}>{folder.description}</span>
            )}
          </div>
        </div>
      </div>
      
      {hasChildren && isExpanded && (
        <div className={styles.children}>
          {folder.children!.map(child => (
            <FolderPickerNode
              key={child.id}
              folder={child}
              selectedFolderIds={selectedFolderIds}
              onToggleSelection={onToggleSelection}
              mode={mode}
              isExpanded={false} // Children start collapsed
              onToggleExpand={onToggleExpand}
              currentFolderId={currentFolderId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FolderPicker: React.FC<FolderPickerProps> = ({
  folders,
  selectedFolderIds,
  onSelectionChange,
  onClose,
  mode,
  title,
  confirmText,
  currentFolderId
}) => {
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedFolderIds);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [folderTree, setFolderTree] = useState<FolderHierarchy[]>([]);
  
  useEffect(() => {
    // Filter out current folder if in move mode
    const availableFolders = mode === 'move' && currentFolderId
      ? folders.filter(f => f.id !== currentFolderId)
      : folders;
    
    setFolderTree(buildFolderTree(availableFolders));
  }, [folders, mode, currentFolderId]);
  
  const handleToggleSelection = (folderId: string) => {
    if (mode === 'move') {
      // Single selection for move mode
      setLocalSelectedIds([folderId]);
    } else {
      // Multiple selection for add mode
      setLocalSelectedIds(prev => 
        prev.includes(folderId)
          ? prev.filter(id => id !== folderId)
          : [...prev, folderId]
      );
    }
  };
  
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
  
  const handleConfirm = () => {
    onSelectionChange(localSelectedIds);
    onClose();
  };
  
  const handleCancel = () => {
    onClose();
  };
  
  const getTitle = () => {
    if (title) return title;
    return mode === 'move' ? 'Move to Folder' : 'Add to Folders';
  };
  
  const getConfirmText = () => {
    if (confirmText) return confirmText;
    return mode === 'move' ? 'Move' : 'Add to Selected';
  };
  
  const canConfirm = localSelectedIds.length > 0;
  
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>{getTitle()}</h3>
          <button 
            className={styles.closeButton}
            onClick={handleCancel}
            type="button"
          >
            ✕
          </button>
        </div>
        
        <div className={styles.content}>
          {folderTree.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No folders available</p>
              <p>Create some folders first!</p>
            </div>
          ) : (
            <div className={styles.folderTree}>
              {folderTree.map(folder => (
                <FolderPickerNode
                  key={folder.id}
                  folder={folder}
                  selectedFolderIds={localSelectedIds}
                  onToggleSelection={handleToggleSelection}
                  mode={mode}
                  isExpanded={expandedFolders.has(folder.id)}
                  onToggleExpand={handleToggleExpand}
                  currentFolderId={currentFolderId}
                />
              ))}
            </div>
          )}
        </div>
        
        <div className={styles.footer}>
          <div className={styles.selectionInfo}>
            {mode === 'add' && localSelectedIds.length > 0 && (
              <span className={styles.selectionCount}>
                {localSelectedIds.length} folder{localSelectedIds.length !== 1 ? 's' : ''} selected
              </span>
            )}
          </div>
          
          <div className={styles.actions}>
            <button 
              className={styles.cancelButton}
              onClick={handleCancel}
              type="button"
            >
              Cancel
            </button>
            <button 
              className={styles.confirmButton}
              onClick={handleConfirm}
              disabled={!canConfirm}
              type="button"
            >
              {getConfirmText()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FolderPicker;