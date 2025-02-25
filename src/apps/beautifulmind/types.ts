export interface Note {
    id: string;
    title: string;
    content: string;
    tags: string[];
    type: 'text' | 'image';
    imageData?: string; // Base64 encoded image data
    createdAt: number;
    updatedAt: number;
  }
  
  export type View = 'notes' | 'folder';
  
  export interface FolderPath {
    tag: string;
    children?: FolderPath[];
  }