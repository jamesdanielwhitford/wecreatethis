// src/app/api/notes/[id]/route.ts

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

// GET /api/notes/[id] - Get a specific note
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select(`
        *,
        media_attachments (*)
      `)
      .eq('id', params.id)
      .single();
    
    if (error) throw error;
    
    if (!data) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }
    
    // Add URLs to media attachments
    const noteWithUrls = {
      ...data,
      media_attachments: data.media_attachments?.map((attachment: any) => ({
        ...attachment,
        url: getMediaUrl(attachment.storage_path),
        thumbnailUrl: attachment.thumbnail_path ? getMediaUrl(attachment.thumbnail_path) : undefined
      }))
    };
    
    return NextResponse.json(noteWithUrls);
  } catch (error) {
    console.error('Error fetching note:', error);
    return NextResponse.json(
      { error: 'Failed to fetch note' },
      { status: 500 }
    );
  }
}

// PUT /api/notes/[id] - Update a note
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { title, content } = body;
    
    const { data, error } = await supabase
      .from('notes')
      .update({ 
        title, 
        content, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', params.id)
      .select(`
        *,
        media_attachments (*)
      `)
      .single();
    
    if (error) throw error;
    
    // Add URLs to media attachments
    const noteWithUrls = {
      ...data,
      media_attachments: data.media_attachments?.map((attachment: any) => ({
        ...attachment,
        url: getMediaUrl(attachment.storage_path),
        thumbnailUrl: attachment.thumbnail_path ? getMediaUrl(attachment.thumbnail_path) : undefined
      }))
    };
    
    return NextResponse.json(noteWithUrls);
  } catch (error) {
    console.error('Error updating note:', error);
    return NextResponse.json(
      { error: 'Failed to update note' },
      { status: 500 }
    );
  }
}

// DELETE /api/notes/[id] - Delete a note
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get all attachments first
    const { data: attachments } = await supabase
      .from('media_attachments')
      .select('storage_path')
      .eq('note_id', params.id);
    
    // Delete all media files from storage
    if (attachments && attachments.length > 0) {
      const paths = attachments.map(a => a.storage_path);
      await supabase.storage.from('note-media').remove(paths);
    }
    
    // Delete note (cascade will delete attachments)
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', params.id);
    
    if (error) throw error;
    
    return NextResponse.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    );
  }
}