// src/apps/beautifulmind/utils/supabase.ts

import { createClient } from '@supabase/supabase-js';
import { Note, MediaAttachment } from '../types/notes.types';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to get media URL
const getMediaUrl = (path: string): string => {
  const { data } = supabase.storage.from('note-media').getPublicUrl(path);
  return data.publicUrl;
};

// Helper function to get audio duration
async function getAudioDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.onloadedmetadata = () => {
      resolve(audio.duration);
      URL.revokeObjectURL(audio.src);
    };
    audio.onerror = () => {
      resolve(undefined);
      URL.revokeObjectURL(audio.src);
    };
    audio.src = URL.createObjectURL(file);
  });
}

// Helper function to get video duration
async function getVideoDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.onloadedmetadata = () => {
      resolve(video.duration);
      URL.revokeObjectURL(video.src);
    };
    video.onerror = () => {
      resolve(undefined);
      URL.revokeObjectURL(video.src);
    };
    video.src = URL.createObjectURL(file);
  });
}

// Helper function to get image dimensions
async function getImageDimensions(file: File): Promise<{ width?: number; height?: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      resolve({});
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  });
}

// Media service
export const mediaService = {
  async uploadFile(noteId: string, file: File): Promise<MediaAttachment> {
    // Generate unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${noteId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('note-media')
      .upload(fileName, file);
    
    if (uploadError) throw uploadError;
    
    // Determine media type
    let mediaType: 'image' | 'video' | 'audio';
    if (file.type.startsWith('video/')) {
      mediaType = 'video';
    } else if (file.type.startsWith('audio/')) {
      mediaType = 'audio';
    } else {
      mediaType = 'image';
    }
    
    // Get media-specific metadata
    let metadata = {};
    
    if (mediaType === 'image') {
      metadata = await getImageDimensions(file);
    } else if (mediaType === 'video') {
      const duration = await getVideoDuration(file);
      if (duration) {
        metadata = { duration };
      }
    } else if (mediaType === 'audio') {
      const duration = await getAudioDuration(file);
      if (duration) {
        metadata = { duration };
      }
    }
    
    // Create media attachment record
    const attachmentData = {
      note_id: noteId,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      storage_path: uploadData.path,
      media_type: mediaType,
      ...metadata
    };
    
    const { data, error } = await supabase
      .from('media_attachments')
      .insert([attachmentData])
      .select()
      .single();
    
    if (error) {
      // Clean up uploaded file on error
      await supabase.storage.from('note-media').remove([uploadData.path]);
      throw error;
    }
    
    // Add URLs for convenience
    return {
      ...data,
      url: getMediaUrl(data.storage_path),
      thumbnailUrl: data.thumbnail_path ? getMediaUrl(data.thumbnail_path) : undefined
    };
  },
  
  async deleteAttachment(attachmentId: string, storagePath: string): Promise<void> {
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('note-media')
      .remove([storagePath]);
    
    if (storageError) throw storageError;
    
    // Delete database record
    const { error } = await supabase
      .from('media_attachments')
      .delete()
      .eq('id', attachmentId);
    
    if (error) throw error;
  }
};

// Database operations
export const notesService = {
  async getAllNotes(): Promise<Note[]> {
    const { data, error } = await supabase
      .from('notes')
      .select(`
        *,
        media_attachments (*)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Add URLs to media attachments
    const notesWithUrls = (data || []).map(note => ({
      ...note,
      media_attachments: note.media_attachments?.map((attachment: MediaAttachment) => ({
        ...attachment,
        url: getMediaUrl(attachment.storage_path),
        thumbnailUrl: attachment.thumbnail_path ? getMediaUrl(attachment.thumbnail_path) : undefined
      }))
    }));
    
    return notesWithUrls;
  },

  async getNoteById(id: string): Promise<Note | null> {
    const { data, error } = await supabase
      .from('notes')
      .select(`
        *,
        media_attachments (*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    if (!data) return null;
    
    // Add URLs to media attachments
    return {
      ...data,
      media_attachments: data.media_attachments?.map((attachment: MediaAttachment) => ({
        ...attachment,
        url: getMediaUrl(attachment.storage_path),
        thumbnailUrl: attachment.thumbnail_path ? getMediaUrl(attachment.thumbnail_path) : undefined
      }))
    };
  },

  async createNote(note: Omit<Note, 'id' | 'created_at' | 'updated_at'>): Promise<Note> {
    const { data, error } = await supabase
      .from('notes')
      .insert([note])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateNote(id: string, updates: Partial<Omit<Note, 'id' | 'created_at'>>): Promise<Note> {
    const { data, error } = await supabase
      .from('notes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        *,
        media_attachments (*)
      `)
      .single();
    
    if (error) throw error;
    
    // Add URLs to media attachments
    return {
      ...data,
      media_attachments: data.media_attachments?.map((attachment: MediaAttachment) => ({
        ...attachment,
        url: getMediaUrl(attachment.storage_path),
        thumbnailUrl: attachment.thumbnail_path ? getMediaUrl(attachment.thumbnail_path) : undefined
      }))
    };
  },

  async deleteNote(id: string): Promise<void> {
    // Get all attachments first
    const { data: attachments } = await supabase
      .from('media_attachments')
      .select('storage_path')
      .eq('note_id', id);
    
    // Delete all media files from storage
    if (attachments && attachments.length > 0) {
      const paths = attachments.map(a => a.storage_path);
      await supabase.storage.from('note-media').remove(paths);
    }
    
    // Delete note (cascade will delete attachments)
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};