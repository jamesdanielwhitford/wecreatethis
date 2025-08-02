// src/app/api/openmind/days-with-entries/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { folderStructureManager } from '@/apps/openmind/utils/folderStructure';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '');
    const month = parseInt(searchParams.get('month') || '');

    if (isNaN(year) || isNaN(month)) {
      return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 });
    }

    // TODO: Get user ID from authentication
    const userId = 'temp-user-id'; // Replace with actual user authentication

    const days = await folderStructureManager.getDaysWithEntries(year, month, userId);

    return NextResponse.json(days);

  } catch (error) {
    console.error('Error fetching days with entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch days with entries' },
      { status: 500 }
    );
  }
}