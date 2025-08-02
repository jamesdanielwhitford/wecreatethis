// src/apps/beautifulmind/components/Breadcrumb/index.tsx

import React from 'react';
import { Folder } from '../../types/notes.types';
import styles from './styles.module.css';

interface BreadcrumbProps {
  path: Folder[];
  onNavigate: (folderId: string | null) => void;
  showHome?: boolean;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ 
  path, 
  onNavigate, 
  showHome = true 
}) => {
  const handleHomeClick = () => {
    onNavigate(null);
  };
  
  const handleFolderClick = (folderId: string) => {
    onNavigate(folderId);
  };
  
  if (path.length === 0 && !showHome) {
    return null;
  }
  
  return (
    <nav className={styles.breadcrumb}>
      {showHome && (
        <>
          <button 
            className={`${styles.breadcrumbItem} ${styles.homeButton}`}
            onClick={handleHomeClick}
            type="button"
          >
            🏠 Home
          </button>
          {path.length > 0 && (
            <span className={styles.separator}>›</span>
          )}
        </>
      )}
      
      {path.map((folder, index) => {
        const isLast = index === path.length - 1;
        
        return (
          <React.Fragment key={folder.id}>
            <button
              className={`${styles.breadcrumbItem} ${isLast ? styles.current : ''}`}
              onClick={() => handleFolderClick(folder.id)}
              disabled={isLast}
              type="button"
            >
              📁 {folder.title}
            </button>
            
            {!isLast && (
              <span className={styles.separator}>›</span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;