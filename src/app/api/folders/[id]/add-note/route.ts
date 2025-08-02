// src/app/api/folders/[id]/add-note/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize service role client for bypass operations  
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

// POST /api/folders/[id]/add-note - Add a note to this folder (additive - keeps existing folder assignments)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { note_id } = body;
    
    if (!note_id) {
      return NextResponse.json(
        { error: 'Note ID is required' },
        { status: 400 }
      );
    }
    
    // Use service role to bypass RLS for testing
    const client = supabaseServiceKey ? supabaseService : supabase;
    
    // Verify note exists
    const { data: note, error: noteError } = await client
      .from('notes')
      .select('id, title')
      .eq('id', note_id)
      .single();
    
    if (noteError || !note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }
    
    // Verify folder exists
    const { data: folder, error: folderError } = await client
      .from('folders')
      .select('id, title')
      .eq('id', params.id)
      .single();
    
    if (folderError || !folder) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }
    
    // Check if note is already in this folder
    const { data: existingRelation } = await client
      .from('folder_notes')
      .select('id')
      .eq('folder_id', params.id)
      .eq('note_id', note_id)
      .single();
    
    if (existingRelation) {
      return NextResponse.json({
        message: 'Note is already in this folder',
        note: { id: note.id, title: note.title },
        folder: { id: folder.id, title: folder.title },
        already_exists: true
      });
    }
    
    // Add note to folder
    const { error: addError } = await client
      .from('folder_notes')
      .insert({
        folder_id: params.id,
        note_id: note_id,
        added_at: new Date().toISOString()
      });
    
    if (addError) {
      throw addError;
    }
    
    return NextResponse.json({
      message: 'Note added to folder successfully',
      note: { id: note.id, title: note.title },
      folder: { id: folder.id, title: folder.title },
      added_at: new Date().toISOString()
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

// DELETE /api/folders/[id]/add-note - Remove a note from this folder
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const note_id = searchParams.get('note_id');
    
    if (!note_id) {
      return NextResponse.json(
        { error: 'Note ID is required' },
        { status: 400 }
      );
    }
    
    // Use service role to bypass RLS for testing
    const client = supabaseServiceKey ? supabaseService : supabase;
    
    // Remove note from folder
    const { error: removeError } = await client
      .from('folder_notes')
      .delete()
      .eq('folder_id', params.id)
      .eq('note_id', note_id);
    
    if (removeError) {
      throw removeError;
    }
    
    return NextResponse.json({
      message: 'Note removed from folder successfully',
      folder_id: params.id,
      note_id: note_id
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