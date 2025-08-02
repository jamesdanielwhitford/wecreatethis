// src/apps/beautifulmind/components/FolderTree/index.tsx

import React, { useState } from 'react';
import { FolderHierarchy, Folder } from '../../types/notes.types';
import styles from './styles.module.css';

interface FolderTreeProps {
  folderTree: FolderHierarchy[];
  selectedFolderId?: string | null;
  onFolderClick: (folder: Folder) => void;
  onFolderDelete?: (folderId: string) => Promise<void>;
  onCreateSubfolder?: (parentId: string) => void;
  expandedFolders?: Set<string>;
  onToggleExpand?: (folderId: string) => void;
  showActions?: boolean;
  compact?: boolean;
}

interface FolderTreeNodeProps {
  folder: FolderHierarchy;
  selectedFolderId?: string | null;
  onFolderClick: (folder: Folder) => void;
  onFolderDelete?: (folderId: string) => Promise<void>;
  onCreateSubfolder?: (parentId: string) => void;
  isExpanded: boolean;
  onToggleExpand?: (folderId: string) => void;
  expandedFolders?: Set<string>;
  showActions?: boolean;
  compact?: boolean;
}

const FolderTreeNode: React.FC<FolderTreeNodeProps> = ({
  folder,
  selectedFolderId,
  onFolderClick,
  onFolderDelete,
  onCreateSubfolder,
  isExpanded,
  onToggleExpand,
  expandedFolders,
  showActions = true,
  compact = false
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  
  const hasChildren = folder.children && folder.children.length > 0;
  const isSelected = selectedFolderId === folder.id;
  
  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleExpand) {
      onToggleExpand(folder.id);
    }
  };
  
  const handleFolderClick = () => {
    onFolderClick(folder);
  };
  
  const handleCreateSubfolder = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCreateSubfolder) {
      onCreateSubfolder(folder.id);
    }
  };
  
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onFolderDelete) return;
    
    if (window.confirm(`Delete folder "${folder.title}"? Notes will not be deleted.`)) {
      try {
        setIsDeleting(true);
        await onFolderDelete(folder.id);
      } catch (err) {
        console.error('Failed to delete folder:', err);
      } finally {
        setIsDeleting(false);
      }
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className={styles.folderNode}>
      <div 
        className={`${styles.folderItem} ${isSelected ? styles.selected : ''} ${compact ? styles.compact : ''}`}
        onClick={handleFolderClick}
        style={{ marginLeft: `${folder.depth * 2}rem` }}
      >
        <div className={styles.folderContent}>
          <div className={styles.folderHeader}>
            {hasChildren && (
              <button 
                className={`${styles.expandButton} ${isExpanded ? styles.expanded : ''}`}
                onClick={handleToggleExpand}
                type="button"
              >
                ▶
              </button>
            )}
            <span className={styles.folderIcon}>📁</span>
            <h3 className={styles.folderTitle}>{folder.title}</h3>
          </div>
          
          {!compact && folder.description && (
            <p className={styles.folderPreview}>{folder.description}</p>
          )}
          
          {!compact && (
            <div className={styles.folderMeta}>
              <span className={styles.folderDate}>
                Created {formatDate(folder.created_at)}
              </span>
              <div className={styles.folderIndicators}>
                <span className={styles.semanticIndicator}>
                  🧠 Semantic
                </span>
              </div>
            </div>
          )}
        </div>
        
        {showActions && onFolderDelete && (
          <button
            className={`${styles.deleteButton}`}
            onClick={handleDelete}
            disabled={isDeleting}
            title="Delete folder"
            type="button"
          >
            {isDeleting ? '⏳' : '✕'}
          </button>
        )}
        
        {showActions && onCreateSubfolder && (
          <div className={styles.folderActions}>
            <button
              className={styles.actionButton}
              onClick={handleCreateSubfolder}
              title="Create subfolder"
              type="button"
            >
              📁+
            </button>
          </div>
        )}
      </div>
      
      {hasChildren && isExpanded && (
        <div className={styles.children}>
          {folder.children!.map(child => (
            <FolderTreeNode
              key={child.id}
              folder={child}
              selectedFolderId={selectedFolderId}
              onFolderClick={onFolderClick}
              onFolderDelete={onFolderDelete}
              onCreateSubfolder={onCreateSubfolder}
              isExpanded={expandedFolders ? expandedFolders.has(child.id) : false}
              onToggleExpand={onToggleExpand}
              expandedFolders={expandedFolders}
              showActions={showActions}
              compact={compact}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FolderTree: React.FC<FolderTreeProps> = ({
  folderTree,
  selectedFolderId,
  onFolderClick,
  onFolderDelete,
  onCreateSubfolder,
  expandedFolders = new Set(),
  onToggleExpand,
  showActions = true,
  compact = false
}) => {
  if (folderTree.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No folders yet</p>
        <p>Create your first folder to get started!</p>
      </div>
    );
  }
  
  return (
    <div className={`${styles.folderTree} ${compact ? styles.compact : ''}`}>
      {folderTree.map(folder => (
        <FolderTreeNode
          key={folder.id}
          folder={folder}
          selectedFolderId={selectedFolderId}
          onFolderClick={onFolderClick}
          onFolderDelete={onFolderDelete}
          onCreateSubfolder={onCreateSubfolder}
          isExpanded={expandedFolders.has(folder.id)}
          onToggleExpand={onToggleExpand}
          expandedFolders={expandedFolders}
          showActions={showActions}
          compact={compact}
        />
      ))}
    </div>
  );
};

export default FolderTree;