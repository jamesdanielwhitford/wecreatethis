export interface Note {
    id: string;
    title: string;
    content: string;
    tags: string[];
    type: 'text' | 'image';
    imageData?: string; // Base64 encoded image data (only in memory, not stored in localStorage)
    createdAt: number;
    updatedAt: number;
  }
  
  // This type is for storing in localStorage (without the image data)
  export interface NoteMetadata {
    id: string;
    title: string;
    content: string;
    tags: string[];
    type: 'text' | 'image';
    imageId?: string; // Reference to an image in IndexedDB
    createdAt: number;
    updatedAt: number;
  }
  
  export type View = 'notes' | 'folder';
  
  export interface FolderPath {
    tag: string;
    children?: FolderPath[];
  }
  
  // Folder metadata for localStorage
  export interface FolderMetadata {
    id: string;
    name: string;
    path: string;  // Full path like "parent/child/grandchild"
    parentId: string | null;
    tag: string;   // Tag used to identify the folder and filter notes
    createdAt: number;
  }
  
  // SubfolderView interface for displaying subfolders in the UI
  export interface SubfolderView {
    id: string;
    name: string;
    tag: string;
    count: number;
  }