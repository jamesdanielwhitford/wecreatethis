// src/app/api/openmind/process/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { topicExtractor } from '@/apps/openmind/utils/topicExtractor';
import { folderStructureManager } from '@/apps/openmind/utils/folderStructure';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const dateString = formData.get('date') as string;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    if (!dateString) {
      return NextResponse.json({ error: 'No date provided' }, { status: 400 });
    }

    const date = new Date(dateString);
    
    // TODO: Get user ID from authentication
    const userId = 'temp-user-id'; // Replace with actual user authentication

    // Step 1: Transcribe the audio
    const transcription = await transcribeAudio(audioFile);
    
    if (!transcription) {
      return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: 500 });
    }

    // Step 2: Extract topics using AI
    const topicExtractionResult = await topicExtractor.extractTopics(transcription);

    // Step 3: Ensure folder structure exists
    const noteFolderId = await folderStructureManager.ensureFolderStructure(date, userId);

    // Step 4: Create the original voice note
    const originalNote = await createNote({
      title: topicExtractionResult.originalTitle,
      content: transcription,
      userId,
      folderId: noteFolderId,
      isOriginal: true,
    });

    // Step 5: Create topic notes
    const topicNotes = [];
    for (const topic of topicExtractionResult.topics) {
      const topicNote = await createNote({
        title: topic.title,
        content: topic.content,
        userId,
        folderId: noteFolderId,
        isOriginal: false,
        topicName: topic.name,
        originalNoteId: originalNote.id,
      });
      topicNotes.push(topicNote);
    }

    // Step 6: Store the audio file (optional - for playback)
    // TODO: Implement audio storage if needed

    return NextResponse.json({
      success: true,
      originalNote,
      topicNotes,
      transcription,
    });

  } catch (error) {
    console.error('Error processing voice note:', error);
    return NextResponse.json(
      { error: 'Failed to process voice note' },
      { status: 500 }
    );
  }
}

async function transcribeAudio(audioFile: File): Promise<string | null> {
  try {
    const response = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
    });

    return response.text;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return null;
  }
}

interface CreateNoteParams {
  title: string;
  content: string;
  userId: string;
  folderId: string;
  isOriginal: boolean;
  topicName?: string;
  originalNoteId?: string;
}

async function createNote(params: CreateNoteParams) {
  const { title, content, userId, folderId, isOriginal, topicName, originalNoteId } = params;

  // Create the note
  const { data: note, error: noteError } = await supabase
    .from('notes')
    .insert({
      title,
      content,
      user_id: userId,
    })
    .select()
    .single();

  if (noteError || !note) {
    throw new Error(`Failed to create note: ${noteError?.message}`);
  }

  // Add note to folder (if Beautiful Mind uses a folder_notes junction table)
  // For now, we'll add metadata to track the relationship
  const noteMetadata = {
    note_id: note.id,
    folder_id: folderId,
    is_openmind_note: true,
    is_original_voice_note: isOriginal,
    topic_name: topicName,
    original_note_id: originalNoteId,
  };

  // Store metadata (you might need to create a separate table for this)
  // For now, we'll use the note's content to include metadata
  
  return {
    ...note,
    ...noteMetadata,
  };
}