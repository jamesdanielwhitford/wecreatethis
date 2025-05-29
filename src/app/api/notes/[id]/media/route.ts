// src/app/api/notes/[id]/media/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to get media URL
const getMediaUrl = (path: string): string => {
  const { data } = supabase.storage.from('note-media').getPublicUrl(path);
  return data.publicUrl;
};

// Helper function to get audio duration
async function getAudioDuration(buffer: ArrayBuffer): Promise<number | undefined> {
  // Note: In a production environment, you'd want to use a proper audio processing library
  // For now, we'll return undefined and let the client handle duration
  return undefined;
}

// Helper function to get video duration  
async function getVideoDuration(buffer: ArrayBuffer): Promise<number | undefined> {
  // Note: In a production environment, you'd want to use a proper video processing library
  // For now, we'll return undefined and let the client handle duration
  return undefined;
}

// Helper function to get image dimensions
async function getImageDimensions(buffer: ArrayBuffer): Promise<{ width?: number; height?: number }> {
  // Note: In a production environment, you'd want to use a proper image processing library
  // For now, we'll return empty object and let the client handle dimensions
  return {};
}

// POST /api/notes/[id]/media - Upload media to a note
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }
    
    const uploadedAttachments = [];
    
    for (const file of files) {
      // Generate unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${params.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      // Convert File to ArrayBuffer for upload
      const arrayBuffer = await file.arrayBuffer();
      
      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('note-media')
        .upload(fileName, arrayBuffer, {
          contentType: file.type
        });
      
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
        metadata = await getImageDimensions(arrayBuffer);
      } else if (mediaType === 'video') {
        const duration = await getVideoDuration(arrayBuffer);
        if (duration) {
          metadata = { duration };
        }
      } else if (mediaType === 'audio') {
        const duration = await getAudioDuration(arrayBuffer);
        if (duration) {
          metadata = { duration };
        }
      }
      
      // Create media attachment record
      const attachmentData = {
        note_id: params.id,
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
      const attachmentWithUrls = {
        ...data,
        url: getMediaUrl(data.storage_path),
        thumbnailUrl: data.thumbnail_path ? getMediaUrl(data.thumbnail_path) : undefined
      };
      
      uploadedAttachments.push(attachmentWithUrls);
    }
    
    return NextResponse.json(uploadedAttachments);
  } catch (error) {
    console.error('Error uploading media:', error);
    return NextResponse.json(
      { error: 'Failed to upload media' },
      { status: 500 }
    );
  }
}