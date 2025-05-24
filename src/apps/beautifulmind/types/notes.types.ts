// src/apps/beautifulmind/types/notes.types.ts

export interface MediaAttachment {
  id: string;
  note_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  media_type: 'image' | 'video' | 'audio';
  thumbnail_path?: string;
  width?: number;
  height?: number;
  duration?: number;
  created_at: string;
  url?: string; // Added for frontend convenience
  thumbnailUrl?: string; // Added for frontend convenience
}

export interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id?: string;
  media_attachments?: MediaAttachment[];
}

export interface NoteFormData {
  title: string;
  content: string;
}

export type ViewMode = 'list' | 'view' | 'edit' | 'create';

export interface UploadProgress {
  fileName: string;
  progress: number;
  error?: string;
}

export interface AudioRecording {
  isRecording: boolean;
  duration: number;
  audioUrl?: string;
  mediaRecorder?: MediaRecorder;
}