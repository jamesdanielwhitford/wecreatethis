// src/app/api/notes/[id]/folders/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client  
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET /api/notes/[id]/folders - Get folders that contain this note
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('=== NOTE CURRENT FOLDERS ===');
    console.log('Note ID:', params.id);
    
    // Step 1: Verify note exists
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('id, title')
      .eq('id', params.id)
      .single();
    
    if (noteError) {
      console.error('Note fetch error:', noteError);
      throw noteError;
    }
    
    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }
    
    console.log('Note found:', note.title);

    // Step 2: Get folders containing this note
    const { data: noteFolders, error: foldersError } = await supabase
      .from('folder_notes')
      .select(`
        added_at,
        folder:folders (
          id,
          title,
          description,
          created_at,
          updated_at
        )
      `)
      .eq('note_id', params.id)
      .order('added_at', { ascending: false });
    
    if (foldersError) {
      console.error('Folders fetch error:', foldersError);
      throw foldersError;
    }
    
    console.log('Found folders containing note:', noteFolders?.length || 0);
    
    // Step 3: Process results
    const processedFolders = (noteFolders || []).map((noteFolder: any) => ({
      ...noteFolder.folder,
      added_to_folder_at: noteFolder.added_at
    }));
    
    return NextResponse.json({
      note: { id: note.id, title: note.title },
      folders: processedFolders,
      total_folders: processedFolders.length
    });
    
  } catch (error) {
    console.error('Error fetching note folders:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch note folders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}