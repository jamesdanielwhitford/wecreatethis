// src/app/api/openmind/months-with-entries/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { folderStructureManager } from '@/apps/openmind/utils/folderStructure';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '');

    if (isNaN(year)) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 });
    }

    // TODO: Get user ID from authentication
    const userId = 'temp-user-id'; // Replace with actual user authentication

    const months = await folderStructureManager.getMonthsWithEntries(year, userId);

    return NextResponse.json(months);

  } catch (error) {
    console.error('Error fetching months with entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch months with entries' },
      { status: 500 }
    );
  }
}