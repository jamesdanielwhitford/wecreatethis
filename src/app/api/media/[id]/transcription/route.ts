// src/app/api/media/[id]/transcription/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// GET /api/media/[id]/transcription - Get transcription status and text
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the media attachment with transcription data
    const { data: attachment, error: fetchError } = await supabase
      .from('media_attachments')
      .select('transcription_text, transcription_status, transcription_error, transcribed_at')
      .eq('id', params.id)
      .single();
    
    if (fetchError) throw fetchError;
    
    if (!attachment) {
      return NextResponse.json(
        { error: 'Media attachment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: attachment.transcription_status || 'not_started',
      text: attachment.transcription_text || null,
      error: attachment.transcription_error || null,
      transcribed_at: attachment.transcribed_at || null
    });

  } catch (error) {
    console.error('Error fetching transcription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcription status' },
      { status: 500 }
    );
  }
}