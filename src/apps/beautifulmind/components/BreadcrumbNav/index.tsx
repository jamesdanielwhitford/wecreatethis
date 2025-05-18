/**
 * File: src/apps/beautifulmind/components/BreadcrumbNav/index.tsx
 * Breadcrumb navigation component for folder hierarchy
 */

'use client';

import React, { useState, useEffect } from 'react';
import styles from './styles.module.css';
import { getFolderById } from '../../utils';

interface BreadcrumbNavProps {
  folderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
}

interface BreadcrumbItem {
  id: string;
  name: string;
}

export const BreadcrumbNav: React.FC<BreadcrumbNavProps> = ({
  folderId,
  onFolderSelect
}) => {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Load breadcrumbs whenever folder ID changes
  useEffect(() => {
    const loadBreadcrumbs = async () => {
      if (!folderId) {
        setBreadcrumbs([]);
        return;
      }

      setIsLoading(true);
      try {
        const breadcrumbPath: BreadcrumbItem[] = [];
        let currentFolderId = folderId;
        
        // Build the path from current folder up to root
        while (currentFolderId) {
          const folder = await getFolderById(currentFolderId);
          if (!folder) break;
          
          breadcrumbPath.unshift({
            id: folder.id,
            name: folder.name
          });
          
          currentFolderId = folder.parentId || null;
        }
        
        setBreadcrumbs(breadcrumbPath);
      } catch (err) {
        console.error('Error loading breadcrumbs:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadBreadcrumbs();
  }, [folderId]);

  // Navigate to folder when clicking breadcrumb
  const handleBreadcrumbClick = (folderId: string | null) => {
    onFolderSelect(folderId);
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!folderId && breadcrumbs.length === 0) {
    return (
      <div className={styles.breadcrumbNav}>
        <span className={styles.rootBreadcrumb}>All Notes</span>
      </div>
    );
  }

  return (
    <div className={styles.breadcrumbNav}>
      <button 
        className={styles.breadcrumbItem}
        onClick={() => handleBreadcrumbClick(null)}
      >
        All Notes
      </button>
      
      {breadcrumbs.map((item, index) => (
        <React.Fragment key={item.id}>
          <span className={styles.separator}>/</span>
          {index === breadcrumbs.length - 1 ? (
            <span className={styles.currentBreadcrumb}>
              {item.name}
            </span>
          ) : (
            <button 
              className={styles.breadcrumbItem}
              onClick={() => handleBreadcrumbClick(item.id)}
            >
              {item.name}
            </button>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default BreadcrumbNav;