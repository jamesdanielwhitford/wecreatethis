// src/app/api/openmind/entries/[date]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { folderStructureManager } from '@/apps/openmind/utils/folderStructure';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(
  request: NextRequest,
  { params }: { params: { date: string } }
) {
  try {
    const { date } = params;
    const requestDate = new Date(date);
    
    if (isNaN(requestDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    // TODO: Get user ID from authentication
    const userId = 'temp-user-id'; // Replace with actual user authentication

    // Get start and end of the day
    const startOfDay = new Date(requestDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(requestDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get notes for this date
    const notes = await folderStructureManager.getNotesForDateRange(
      startOfDay,
      endOfDay,
      userId
    );

    // Transform notes into OpenMind entries
    const entries = notes.map(note => ({
      id: note.id,
      title: note.title,
      content: note.content,
      date: note.created_at.split('T')[0],
      type: note.title.includes('Voice Note') ? 'original' : 'topic',
      created_at: note.created_at,
      // Additional metadata would be stored elsewhere in production
      topicName: note.title.includes('Voice Note') ? undefined : 'Topic',
      originalNoteId: note.title.includes('Voice Note') ? undefined : 'original-id',
    }));

    return NextResponse.json(entries);

  } catch (error) {
    console.error('Error fetching entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch entries' },
      { status: 500 }
    );
  }
}