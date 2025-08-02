// src/apps/openmind/types/openmind.types.ts

import { Note } from '@/apps/beautifulmind/types/notes.types';

export type ViewMode = 'day' | 'month' | 'year';

export interface OpenMindEntry {
  id: string;
  title: string;
  content: string;
  date: string;
  type: 'original' | 'topic';
  originalNoteId?: string; // For topic notes, reference to original
  topicName?: string; // For topic notes
  created_at: string;
}

export interface DayEntries {
  date: string;
  entries: OpenMindEntry[];
}

export interface TopicExtractionResult {
  topics: Array<{
    name: string;
    content: string;
    title: string;
  }>;
  originalTitle: string;
}

export interface VoiceRecording {
  isRecording: boolean;
  duration: number;
  audioBlob?: Blob;
  audioUrl?: string;
  mediaRecorder?: MediaRecorder;
}

export interface OpenMindNote extends Note {
  isOpenMindNote: boolean;
  dayFolder?: string;
  monthFolder?: string;
  yearFolder?: string;
  noteFolder?: string;
}