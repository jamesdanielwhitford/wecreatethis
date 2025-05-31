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
  // Transcription fields
  transcription_text?: string;
  transcription_status?: 'not_started' | 'pending' | 'completed' | 'failed';
  transcription_error?: string;
  transcribed_at?: string;
  // New description fields
  description?: string; // User-provided or AI-generated description
  ai_generated_description?: boolean; // Whether description was AI-generated
  description_status?: 'not_started' | 'pending' | 'completed' | 'failed';
  description_error?: string;
  described_at?: string;
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
  // Add transcription options
  shouldTranscribe?: boolean;
  transcriptionStatus?: 'not_started' | 'pending' | 'completed' | 'failed';
  // Add description options
  shouldDescribe?: boolean;
  description?: string;
  descriptionStatus?: 'not_started' | 'pending' | 'completed' | 'failed';
}

export interface AudioRecording {
  isRecording: boolean;
  duration: number;
  audioUrl?: string;
  mediaRecorder?: MediaRecorder;
  shouldTranscribe?: boolean; // Add option for recordings
}

// New type for files that haven't been uploaded yet (during note creation)
export interface PendingMediaFile {
  id: string; // temporary ID for React keys
  file: File;
  shouldTranscribe: boolean;
  shouldDescribe: boolean; // Add description option
  description?: string; // Manual description
  media_type: 'image' | 'video' | 'audio';
  preview_url?: string; // for images/videos
}