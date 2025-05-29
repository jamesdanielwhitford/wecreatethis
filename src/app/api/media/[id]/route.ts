// src/app/api/media/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// DELETE /api/media/[id] - Delete a specific media attachment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the media attachment to find the storage path
    const { data: attachment, error: fetchError } = await supabase
      .from('media_attachments')
      .select('storage_path')
      .eq('id', params.id)
      .single();
    
    if (fetchError) throw fetchError;
    
    if (!attachment) {
      return NextResponse.json(
        { error: 'Media attachment not found' },
        { status: 404 }
      );
    }
    
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('note-media')
      .remove([attachment.storage_path]);
    
    if (storageError) throw storageError;
    
    // Delete database record
    const { error: deleteError } = await supabase
      .from('media_attachments')
      .delete()
      .eq('id', params.id);
    
    if (deleteError) throw deleteError;
    
    return NextResponse.json({ message: 'Media deleted successfully' });
  } catch (error) {
    console.error('Error deleting media:', error);
    return NextResponse.json(
      { error: 'Failed to delete media' },
      { status: 500 }
    );
  }
}