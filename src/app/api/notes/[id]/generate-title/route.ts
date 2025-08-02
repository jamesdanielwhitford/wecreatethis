// src/app/api/notes/[id]/generate-title/route.ts

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

// Helper function to wait for pending AI services to complete
async function waitForAIServices(noteId: string, maxWaitTime: number = 60000): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    const { data: attachments } = await supabase
      .from('media_attachments')
      .select('transcription_status, description_status')
      .eq('note_id', noteId);
    
    if (!attachments || attachments.length === 0) {
      break; // No attachments to wait for
    }
    
    const hasPendingServices = attachments.some(attachment => 
      attachment.transcription_status === 'pending' || 
      attachment.description_status === 'pending'
    );
    
    if (!hasPendingServices) {
      break; // All services completed or failed
    }
    
    // Wait 2 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Helper function to generate title using OpenAI
async function generateTitle(content: string, transcriptions: string[], descriptions: string[]): Promise<string> {
  // Combine all content for title generation
  let fullContent = content.trim();
  
  if (transcriptions.length > 0) {
    fullContent += '\n\nAudio transcriptions:\n' + transcriptions.join('\n\n');
  }
  
  if (descriptions.length > 0) {
    fullContent += '\n\nImage descriptions:\n' + descriptions.join('\n');
  }
  
  if (!fullContent.trim()) {
    return 'Untitled Note';
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that generates concise, descriptive titles for notes. Create a title that captures the main topic or theme of the content. Keep it under 60 characters and make it useful for someone trying to find this note later. Do not use quotes around the title."
        },
        {
          role: "user",
          content: `Please generate a short, descriptive title for this note content:\n\n${fullContent}`
        }
      ],
      max_tokens: 50,
      temperature: 0.3
    });

    const generatedTitle = response.choices[0]?.message?.content?.trim();
    
    if (!generatedTitle) {
      return 'Untitled Note';
    }
    
    // Clean up the title (remove quotes if AI added them despite instructions)
    return generatedTitle.replace(/^["']|["']$/g, '').substring(0, 100);
    
  } catch (error) {
    console.error('Failed to generate title:', error);
    return 'Untitled Note';
  }
}

// POST /api/notes/[id]/generate-title - Generate AI title for a note
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the note with its content and media attachments
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select(`
        *,
        media_attachments (*)
      `)
      .eq('id', params.id)
      .single();
    
    if (noteError) throw noteError;
    
    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    // Check if note already has a title (excluding 'Untitled Note' placeholder)
    if (note.title && note.title.trim() && note.title.trim() !== 'Untitled Note') {
      return NextResponse.json({ 
        title: note.title,
        message: 'Note already has a title' 
      });
    }

    // Wait for any pending AI services to complete (with timeout)
    await waitForAIServices(params.id, 60000); // Wait up to 60 seconds

    // Fetch updated attachments after waiting
    const { data: updatedAttachments } = await supabase
      .from('media_attachments')
      .select('*')
      .eq('note_id', params.id);

    // Collect all transcriptions and descriptions
    const transcriptions: string[] = [];
    const descriptions: string[] = [];
    
    if (updatedAttachments) {
      for (const attachment of updatedAttachments) {
        if (attachment.transcription_text && attachment.transcription_status === 'completed') {
          transcriptions.push(attachment.transcription_text);
        }
        if (attachment.description && attachment.description_status === 'completed') {
          descriptions.push(attachment.description);
        }
      }
    }

    // Generate the title
    const generatedTitle = await generateTitle(note.content || '', transcriptions, descriptions);

    // Update the note with the generated title
    const { data: updatedNote, error: updateError } = await supabase
      .from('notes')
      .update({ 
        title: generatedTitle,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select(`
        *,
        media_attachments (*)
      `)
      .single();
    
    if (updateError) throw updateError;

    // Add URLs to media attachments
    const noteWithUrls = {
      ...updatedNote,
      media_attachments: updatedNote.media_attachments?.map((attachment: any) => ({
        ...attachment,
        url: supabase.storage.from('note-media').getPublicUrl(attachment.storage_path).data.publicUrl,
        thumbnailUrl: attachment.thumbnail_path ? supabase.storage.from('note-media').getPublicUrl(attachment.thumbnail_path).data.publicUrl : undefined
      }))
    };

    return NextResponse.json({
      note: noteWithUrls,
      title: generatedTitle,
      message: 'Title generated successfully'
    });

  } catch (error) {
    console.error('Error generating title:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? error.message 
          : 'Failed to generate title' 
      },
      { status: 500 }
    );
  }
}