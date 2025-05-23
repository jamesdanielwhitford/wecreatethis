// src/apps/beautifulmind/types/note.types.ts

export interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id?: string;
}

export interface NoteFormData {
  title: string;
  content: string;
}

export type ViewMode = 'list' | 'view' | 'edit' | 'create';