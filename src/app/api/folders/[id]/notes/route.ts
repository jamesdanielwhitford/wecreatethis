// src/app/api/folders/[id]/notes/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface MediaAttachment {
  id: string;
  storage_path: string;
  thumbnail_path?: string;
  file_name: string;
  file_size: number;
  mime_type: string;
}



// Initialize Supabase client  
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to get media URL
const getMediaUrl = (path: string): string => {
  const { data } = supabase.storage.from('note-media').getPublicUrl(path);
  return data.publicUrl;
};

// GET /api/folders/[id]/notes - Get notes that are manually added to this folder
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('=== MANUAL FOLDER NOTES ===');
    console.log('Folder ID:', params.id);
    
    // Step 1: Verify folder exists
    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select('id, title, description')
      .eq('id', params.id)
      .single();
    
    if (folderError) {
      console.error('Folder fetch error:', folderError);
      throw folderError;
    }
    
    if (!folder) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }
    
    console.log('Folder found:', folder.title);

    // Step 2: Get notes that are manually added to this folder
    const { data: folderNotes, error: notesError } = await supabase
      .from('folder_notes')
      .select(`
        added_at,
        note:notes (
          id,
          title,
          content,
          created_at,
          updated_at,
          media_attachments (*)
        )
      `)
      .eq('folder_id', params.id)
      .order('added_at', { ascending: false });
    
    if (notesError) {
      console.error('Notes fetch error:', notesError);
      throw notesError;
    }
    
    console.log('Found manually added notes:', folderNotes?.length || 0);
    
    // Step 3: Process results and add media URLs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processedNotes = (folderNotes || []).map((folderNote: any) => {
      const note = folderNote.note;
      return {
        ...note,
        added_to_folder_at: folderNote.added_at,
        media_attachments: note.media_attachments?.map((attachment: MediaAttachment) => ({
          ...attachment,
          url: getMediaUrl(attachment.storage_path),
          thumbnailUrl: attachment.thumbnail_path ? getMediaUrl(attachment.thumbnail_path) : undefined
        }))
      };
    });
    
    return NextResponse.json({
      folder,
      notes: processedNotes,
      total_notes: processedNotes.length,
      method: 'manual_folder_membership'
    });
    
  } catch (error) {
    console.error('Error fetching folder notes:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch folder notes',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}