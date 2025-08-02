// src/apps/beautifulmind/utils/folder-hierarchy.ts

import { Folder, FolderHierarchy, FolderTreeNode } from '../types/notes.types';

/**
 * Utility functions for managing folder hierarchies
 */

/**
 * Build a folder hierarchy tree from a flat array of folders
 */
export function buildFolderTree(folders: Folder[]): FolderHierarchy[] {
  const folderMap = new Map<string, FolderHierarchy>();
  const rootFolders: FolderHierarchy[] = [];

  // First pass: create all folder nodes
  folders.forEach(folder => {
    folderMap.set(folder.id, {
      ...folder,
      children: [],
      depth: 0,
      path: [],
      breadcrumb: []
    });
  });

  // Second pass: build the hierarchy
  folders.forEach(folder => {
    const folderNode = folderMap.get(folder.id)!;
    
    if (folder.parent_folder_id) {
      const parent = folderMap.get(folder.parent_folder_id);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(folderNode);
        
        // Calculate depth and path
        folderNode.depth = parent.depth + 1;
        folderNode.path = [...parent.path, folder.id];
        folderNode.breadcrumb = [...parent.breadcrumb, { id: folder.id, title: folder.title }];
      } else {
        // Parent not found, treat as root
        rootFolders.push(folderNode);
      }
    } else {
      // Root level folder
      folderNode.path = [folder.id];
      folderNode.breadcrumb = [{ id: folder.id, title: folder.title }];
      rootFolders.push(folderNode);
    }
  });

  return rootFolders;
}

/**
 * Get all descendant folder IDs for a given folder
 */
export function getDescendantFolderIds(folderId: string, folders: Folder[]): string[] {
  const descendants: string[] = [];
  const children = folders.filter(f => f.parent_folder_id === folderId);
  
  children.forEach(child => {
    descendants.push(child.id);
    // Recursively get descendants of this child
    descendants.push(...getDescendantFolderIds(child.id, folders));
  });
  
  return descendants;
}

/**
 * Get the full path from root to a specific folder
 */
export function getFolderPath(folderId: string, folders: Folder[]): Folder[] {
  const path: Folder[] = [];
  let currentFolder = folders.find(f => f.id === folderId);
  
  while (currentFolder) {
    path.unshift(currentFolder);
    if (currentFolder.parent_folder_id) {
      currentFolder = folders.find(f => f.id === currentFolder!.parent_folder_id);
    } else {
      break;
    }
  }
  
  return path;
}

/**
 * Get breadcrumb navigation for a folder
 */
export function getFolderBreadcrumb(folderId: string, folders: Folder[]): { id: string; title: string }[] {
  const path = getFolderPath(folderId, folders);
  return path.map(folder => ({ id: folder.id, title: folder.title }));
}

/**
 * Check if a folder can be moved to a target parent (prevents circular references)
 */
export function canMoveFolder(folderId: string, targetParentId: string | null, folders: Folder[]): boolean {
  if (!targetParentId) return true; // Moving to root is always allowed
  if (folderId === targetParentId) return false; // Can't be parent of itself
  
  // Check if target would create a circular reference
  const targetPath = getFolderPath(targetParentId, folders);
  return !targetPath.some(folder => folder.id === folderId);
}

/**
 * Get all root level folders (no parent)
 */
export function getRootFolders(folders: Folder[]): Folder[] {
  return folders.filter(folder => !folder.parent_folder_id);
}

/**
 * Get immediate children of a folder
 */
export function getChildFolders(parentId: string | null, folders: Folder[]): Folder[] {
  if (parentId === null) {
    return getRootFolders(folders);
  }
  return folders.filter(folder => folder.parent_folder_id === parentId);
}

/**
 * Flatten a folder hierarchy tree back to a linear array
 */
export function flattenFolderTree(tree: FolderHierarchy[]): Folder[] {
  const result: Folder[] = [];
  
  function traverse(nodes: FolderHierarchy[]) {
    nodes.forEach(node => {
      const { children, depth, path, breadcrumb, ...folder } = node;
      result.push(folder);
      if (children && children.length > 0) {
        traverse(children);
      }
    });
  }
  
  traverse(tree);
  return result;
}

/**
 * Find a folder by ID in a hierarchy tree
 */
export function findFolderInTree(tree: FolderHierarchy[], folderId: string): FolderHierarchy | null {
  for (const node of tree) {
    if (node.id === folderId) {
      return node;
    }
    if (node.children && node.children.length > 0) {
      const found = findFolderInTree(node.children, folderId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Count total folders in a hierarchy tree
 */
export function countFoldersInTree(tree: FolderHierarchy[]): number {
  let count = 0;
  
  function traverse(nodes: FolderHierarchy[]) {
    count += nodes.length;
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    });
  }
  
  traverse(tree);
  return count;
}

/**
 * Sort folders by title within each level
 */
export function sortFolderTree(tree: FolderHierarchy[]): FolderHierarchy[] {
  const sorted = [...tree].sort((a, b) => a.title.localeCompare(b.title));
  
  return sorted.map(folder => ({
    ...folder,
    children: folder.children ? sortFolderTree(folder.children) : []
  }));
}

/**
 * Convert folder hierarchy to tree nodes for UI components
 */
export function convertToTreeNodes(
  tree: FolderHierarchy[], 
  expandedFolders: Set<string> = new Set()
): FolderTreeNode[] {
  return tree.map(folder => ({
    folder: {
      id: folder.id,
      user_id: folder.user_id,
      parent_folder_id: folder.parent_folder_id,
      title: folder.title,
      description: folder.description,
      enhanced_description: folder.enhanced_description,
      ai_matching_description: folder.ai_matching_description,
      created_at: folder.created_at,
      updated_at: folder.updated_at,
      title_embedding: folder.title_embedding,
      description_embedding: folder.description_embedding,
      enhanced_description_embedding: folder.enhanced_description_embedding,
      ai_matching_embedding: folder.ai_matching_embedding,
      last_embedded_at: folder.last_embedded_at,
      added_to_folder_at: folder.added_to_folder_at
    },
    children: folder.children ? convertToTreeNodes(folder.children, expandedFolders) : [],
    isExpanded: expandedFolders.has(folder.id),
    level: folder.depth
  }));
}