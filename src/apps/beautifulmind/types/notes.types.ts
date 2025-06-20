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
  transcription_embedding?: number[]; // Vector embedding of transcription
  
  // Description fields
  description?: string; // User-provided or AI-generated description
  ai_generated_description?: boolean; // Whether description was AI-generated
  description_status?: 'not_started' | 'pending' | 'completed' | 'failed';
  description_error?: string;
  described_at?: string;
  description_embedding?: number[]; // Vector embedding of description
  
  // NEW: AI categorization fields
  ai_categorization_description?: string; // AI-generated categorization for folder matching
  ai_categorization_embedding?: number[]; // Vector embedding of AI categorization
  
  // Embedding metadata
  last_embedded_at?: string; // When embeddings were last generated
}

export interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id?: string;
  media_attachments?: MediaAttachment[];
  
  // Embedding fields
  title_embedding?: number[]; // Vector embedding of title
  content_embedding?: number[]; // Vector embedding of content
  summary?: string; // AI-generated summary
  summary_embedding?: number[]; // Vector embedding of summary
  ai_categorization_description?: string; // NEW: AI-generated categorization for matching
  ai_categorization_embedding?: number[]; // NEW: Vector embedding of AI categorization
  last_embedded_at?: string; // When embeddings were last generated
}

export interface Folder {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  enhanced_description?: string; // AI-enhanced version with strategic keywords
  ai_matching_description?: string; // NEW: AI-generated description optimized for matching
  created_at: string;
  updated_at: string;
  
  // Embedding fields
  title_embedding?: number[]; // Vector embedding of title
  description_embedding?: number[]; // Vector embedding of description
  enhanced_description_embedding?: number[]; // Vector embedding of enhanced description
  ai_matching_embedding?: number[]; // NEW: Vector embedding of AI matching description
  last_embedded_at?: string; // When embeddings were last generated
}

export interface PendingEmbedding {
  id: string;
  entity_type: 'note' | 'media_attachment' | 'folder';
  entity_id: string;
  field_name: string; // 'title', 'content', 'transcription', 'description', etc.
  priority: number; // 1-10, lower = higher priority
  created_at: string;
  processed_at?: string;
  error_message?: string;
}

export interface NoteFormData {
  title: string;
  content: string;
}

export interface FolderFormData {
  title: string;
  description?: string;
}

export type ViewMode = 'list' | 'view' | 'edit' | 'create' | 'folders' | 'folder-view' | 'folder-edit' | 'folder-create';

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

// Search and similarity types
export interface SimilaritySearchResult {
  id: string;
  similarity_score: number;
  entity_type: 'note' | 'media_attachment' | 'folder';
  entity: Note | MediaAttachment | Folder;
}

export interface FolderNoteResult {
  note: Note;
  similarity_score: number;
  matched_fields: string[]; // Which fields contributed to the match
}

export interface EmbeddingStats {
  total_embeddings: number;
  pending_embeddings: number;
  last_processed: string;
  by_entity_type: {
    notes: number;
    media_attachments: number;
    folders: number;
  };
}

// AI enhancement types
export interface AIEnhancementRequest {
  type: 'folder_description' | 'note_summary';
  content: string;
  context?: {
    existing_folders?: Folder[];
    note_content?: string;
    media_descriptions?: string[];
    transcriptions?: string[];
  };
}

export interface AIEnhancementResult {
  enhanced_content: string;
  strategy_explanation?: string; // Why certain keywords were added
  confidence_score?: number; // 0-1, how confident the AI is
}