// src/app/api/notes/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Note } from '@/apps/beautifulmind/types/notes.types';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to get media URL
const getMediaUrl = (path: string): string => {
  const { data } = supabase.storage.from('note-media').getPublicUrl(path);
  return data.publicUrl;
};

// GET /api/notes - Get all notes
export async function GET() {
  try {
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
      media_attachments: note.media_attachments?.map((attachment: any) => ({
        ...attachment,
        url: getMediaUrl(attachment.storage_path),
        thumbnailUrl: attachment.thumbnail_path ? getMediaUrl(attachment.thumbnail_path) : undefined
      }))
    }));
    
    return NextResponse.json(notesWithUrls);
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

// POST /api/notes - Create a new note
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content } = body;
    
    const { data, error } = await supabase
      .from('notes')
      .insert([{ title, content }])
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    );
  }
}