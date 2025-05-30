// src/app/api/media/[id]/transcribe/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to download file from Supabase storage
async function downloadAudioFile(storagePath: string): Promise<Blob> {
  const { data, error } = await supabase.storage
    .from('note-media')
    .download(storagePath);
  
  if (error) throw error;
  if (!data) throw new Error('No file data received');
  
  return data;
}

// Helper function to convert blob to File object for OpenAI
function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type });
}

// POST /api/media/[id]/transcribe - Start or retry transcription
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the media attachment
    const { data: attachment, error: fetchError } = await supabase
      .from('media_attachments')
      .select('*')
      .eq('id', params.id)
      .single();
    
    if (fetchError) throw fetchError;
    
    if (!attachment) {
      return NextResponse.json(
        { error: 'Media attachment not found' },
        { status: 404 }
      );
    }

    // Check if it's an audio file
    if (attachment.media_type !== 'audio') {
      return NextResponse.json(
        { error: 'Only audio files can be transcribed' },
        { status: 400 }
      );
    }

    // Update status to pending
    const { error: updateError } = await supabase
      .from('media_attachments')
      .update({ 
        transcription_status: 'pending',
        transcription_error: null
      })
      .eq('id', params.id);
    
    if (updateError) throw updateError;

    try {
      // Download the audio file from storage
      const audioBlob = await downloadAudioFile(attachment.storage_path);
      
      // Convert to File object
      const audioFile = blobToFile(audioBlob, attachment.file_name);
      
      // Validate file size (Whisper has a 25MB limit)
      const maxSize = 25 * 1024 * 1024; // 25MB
      if (audioFile.size > maxSize) {
        throw new Error('Audio file too large for transcription (max 25MB)');
      }

      // Call OpenAI Whisper API
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'en', // You could make this configurable
        response_format: 'text',
      });

      // Update the database with the transcription
      const { data: updatedAttachment, error: finalUpdateError } = await supabase
        .from('media_attachments')
        .update({
          transcription_text: transcription,
          transcription_status: 'completed',
          transcription_error: null,
          transcribed_at: new Date().toISOString()
        })
        .eq('id', params.id)
        .select()
        .single();

      if (finalUpdateError) throw finalUpdateError;

      // Add URL for convenience
      const result = {
        ...updatedAttachment,
        url: supabase.storage.from('note-media').getPublicUrl(updatedAttachment.storage_path).data.publicUrl
      };

      return NextResponse.json(result);

    } catch (transcriptionError) {
      console.error('Transcription error:', transcriptionError);
      
      // Update status to failed
      await supabase
        .from('media_attachments')
        .update({
          transcription_status: 'failed',
          transcription_error: transcriptionError instanceof Error 
            ? transcriptionError.message 
            : 'Unknown transcription error'
        })
        .eq('id', params.id);

      throw transcriptionError;
    }

  } catch (error) {
    console.error('Error in transcription:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? error.message 
          : 'Failed to process transcription' 
      },
      { status: 500 }
    );
  }
}