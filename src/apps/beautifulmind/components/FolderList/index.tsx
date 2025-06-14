// src/apps/beautifulmind/components/FolderList/index.tsx

import React from 'react';
import { Folder } from '../../types/notes.types';
import styles from './styles.module.css';

interface FolderListProps {
  folders: Folder[];
  onFolderClick: (folder: Folder) => void;
  onFolderDelete?: (id: string) => void;
}

const FolderList: React.FC<FolderListProps> = ({ folders, onFolderClick, onFolderDelete }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPreview = (description: string | undefined) => {
    if (!description) return 'No description';
    const maxLength = 150;
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength) + '...';
  };

  const getEmbeddingStatus = (folder: Folder) => {
    const hasEmbeddings = folder.title_embedding || folder.description_embedding || folder.enhanced_description_embedding;
    return hasEmbeddings ? '🔍' : '⏳';
  };

  if (folders.length === 0) {
    return (
      <div className={styles.emptyState}>
        <h3>No folders yet</h3>
        <p>Create your first semantic folder to organize notes by topic!</p>
      </div>
    );
  }

  return (
    <div className={styles.folderList}>
      {folders.map((folder) => (
        <div
          key={folder.id}
          className={styles.folderCard}
          onClick={() => onFolderClick(folder)}
        >
          <div className={styles.folderContent}>
            <div className={styles.folderHeader}>
              <div className={styles.folderIcon}>📁</div>
              <h3 className={styles.folderTitle}>{folder.title}</h3>
              <div className={styles.embeddingStatus} title={
                folder.title_embedding || folder.description_embedding ? 
                'Folder is ready for semantic search' : 
                'Embeddings processing...'
              }>
                {getEmbeddingStatus(folder)}
              </div>
            </div>
            <p className={styles.folderPreview}>{getPreview(folder.description)}</p>
            <div className={styles.folderMeta}>
              <span className={styles.folderDate}>{formatDate(folder.created_at)}</span>
              <div className={styles.folderIndicators}>
                <span className={styles.semanticIndicator} title="Semantic folder - finds related notes automatically">
                  🧠 Smart Folder
                </span>
              </div>
            </div>
          </div>
          {onFolderDelete && (
            <button
              className={styles.deleteButton}
              onClick={(e) => {
                e.stopPropagation();
                onFolderDelete(folder.id);
              }}
              aria-label="Delete folder"
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default FolderList;