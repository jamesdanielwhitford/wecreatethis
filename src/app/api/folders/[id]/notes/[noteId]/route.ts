// src/app/api/folders/[id]/notes/[noteId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client  
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// POST /api/folders/[id]/notes/[noteId] - Add a note to a folder
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; noteId: string } }
) {
  try {
    console.log('=== ADD NOTE TO FOLDER ===');
    console.log('Folder ID:', params.id);
    console.log('Note ID:', params.noteId);
    
    // Verify both folder and note exist
    const [folderResult, noteResult] = await Promise.all([
      supabase
        .from('folders')
        .select('id, title')
        .eq('id', params.id)
        .single(),
      supabase
        .from('notes')
        .select('id, title')
        .eq('id', params.noteId)
        .single()
    ]);
    
    if (folderResult.error) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }
    
    if (noteResult.error) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }
    
    console.log('Adding note to folder:', noteResult.data.title, '->', folderResult.data.title);
    
    // Add the note to the folder using the helper function
    const { data, error } = await supabase.rpc('add_note_to_folder', {
      p_folder_id: params.id,
      p_note_id: params.noteId,
      p_added_by: null // Could be set to user ID when auth is implemented
    });
    
    if (error) {
      console.error('Error adding note to folder:', error);
      throw error;
    }
    
    // Get the created relationship record
    const { data: folderNote, error: fetchError } = await supabase
      .from('folder_notes')
      .select('*')
      .eq('folder_id', params.id)
      .eq('note_id', params.noteId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching created relationship:', fetchError);
      throw fetchError;
    }
    
    console.log('Successfully added note to folder');
    
    return NextResponse.json({
      message: 'Note added to folder successfully',
      folder: folderResult.data,
      note: noteResult.data,
      relationship: folderNote,
      added_at: folderNote.added_at
    });
    
  } catch (error) {
    console.error('Error adding note to folder:', error);
    return NextResponse.json(
      { 
        error: 'Failed to add note to folder',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/folders/[id]/notes/[noteId] - Remove a note from a folder
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; noteId: string } }
) {
  try {
    console.log('=== REMOVE NOTE FROM FOLDER ===');
    console.log('Folder ID:', params.id);
    console.log('Note ID:', params.noteId);
    
    // Remove the note from the folder using the helper function
    const { data: success, error } = await supabase.rpc('remove_note_from_folder', {
      p_folder_id: params.id,
      p_note_id: params.noteId
    });
    
    if (error) {
      console.error('Error removing note from folder:', error);
      throw error;
    }
    
    if (!success) {
      return NextResponse.json(
        { error: 'Note was not in this folder' },
        { status: 404 }
      );
    }
    
    console.log('Successfully removed note from folder');
    
    return NextResponse.json({
      message: 'Note removed from folder successfully'
    });
    
  } catch (error) {
    console.error('Error removing note from folder:', error);
    return NextResponse.json(
      { 
        error: 'Failed to remove note from folder',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}