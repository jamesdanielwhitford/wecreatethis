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