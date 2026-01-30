// src/apps/openmind/utils/folderStructure.ts

import { createClient } from '@supabase/supabase-js';
import { Folder, FolderFormData } from '@/apps/beautifulmind/types/notes.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export class FolderStructureManager {
  private readonly OPENMIND_ROOT_FOLDER = 'Open Mind';

  /**
   * Ensures the complete folder structure exists for a given date
   * Returns the note folder ID where the note should be stored
   */
  async ensureFolderStructure(date: Date, userId: string): Promise<string> {
    try {
      // 1. Ensure root "Open Mind" folder exists
      const rootFolder = await this.ensureRootFolder(userId);
      
      // 2. Ensure year folder exists
      const year = date.getFullYear().toString();
      const yearFolder = await this.ensureSubFolder(rootFolder.id, year, userId);
      
      // 3. Ensure month folder exists
      const month = date.toLocaleDateString('en-US', { month: 'long' });
      const monthFolder = await this.ensureSubFolder(yearFolder.id, month, userId);
      
      // 4. Ensure day folder exists
      const day = `Day-${date.getDate().toString().padStart(2, '0')}`;
      const dayFolder = await this.ensureSubFolder(monthFolder.id, day, userId);
      
      // 5. Create unique note folder
      const noteFolder = await this.createNoteFolder(dayFolder.id, userId);
      
      return noteFolder.id;
    } catch (error) {
      console.error('Error ensuring folder structure:', error);
      throw new Error('Failed to create folder structure');
    }
  }

  /**
   * Ensures the root "Open Mind" folder exists
   */
  private async ensureRootFolder(userId: string): Promise<Folder> {
    // Check if root folder already exists
    const { data: existingFolder, error: searchError } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', userId)
      .eq('title', this.OPENMIND_ROOT_FOLDER)
      .is('parent_folder_id', null)
      .single();

    if (existingFolder && !searchError) {
      return existingFolder;
    }

    // Create root folder
    const folderData: FolderFormData = {
      title: this.OPENMIND_ROOT_FOLDER,
      description: 'Voice journal entries organized by date',
      parent_folder_id: null,
    };

    const { data: newFolder, error: createError } = await supabase
      .from('folders')
      .insert({
        ...folderData,
        user_id: userId,
      })
      .select()
      .single();

    if (createError || !newFolder) {
      throw new Error(`Failed to create root folder: ${createError?.message}`);
    }

    return newFolder;
  }

  /**
   * Ensures a subfolder exists under a parent folder
   */
  private async ensureSubFolder(parentId: string, title: string, userId: string): Promise<Folder> {
    // Check if subfolder already exists
    const { data: existingFolder, error: searchError } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', userId)
      .eq('title', title)
      .eq('parent_folder_id', parentId)
      .single();

    if (existingFolder && !searchError) {
      return existingFolder;
    }

    // Create subfolder
    const folderData: FolderFormData = {
      title,
      parent_folder_id: parentId,
    };

    const { data: newFolder, error: createError } = await supabase
      .from('folders')
      .insert({
        ...folderData,
        user_id: userId,
      })
      .select()
      .single();

    if (createError || !newFolder) {
      throw new Error(`Failed to create subfolder "${title}": ${createError?.message}`);
    }

    return newFolder;
  }

  /**
   * Creates a unique folder for a specific note session
   */
  private async createNoteFolder(dayFolderId: string, userId: string): Promise<Folder> {
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    
    const noteId = this.generateNoteId();
    const title = `Note-${timestamp}-${noteId}`;

    const folderData: FolderFormData = {
      title,
      description: 'Voice note and extracted topics',
      parent_folder_id: dayFolderId,
    };

    const { data: newFolder, error: createError } = await supabase
      .from('folders')
      .insert({
        ...folderData,
        user_id: userId,
      })
      .select()
      .single();

    if (createError || !newFolder) {
      throw new Error(`Failed to create note folder: ${createError?.message}`);
    }

    return newFolder;
  }

  /**
   * Generates a short unique identifier for notes
   */
  private generateNoteId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  /**
   * Gets all notes from OpenMind folders for a specific date range
   */
  async getNotesForDateRange(startDate: Date, endDate: Date, userId: string): Promise<{ created_at: string; [key: string]: unknown }[]> {
    try {
      // Find the root OpenMind folder
      const { data: rootFolder } = await supabase
        .from('folders')
        .select('id')
        .eq('user_id', userId)
        .eq('title', this.OPENMIND_ROOT_FOLDER)
        .is('parent_folder_id', null)
        .single();

      if (!rootFolder) {
        return []; // No OpenMind folder exists yet
      }

      // Get all notes in OpenMind folder hierarchy
      const { data: notes, error } = await supabase
        .from('notes')
        .select(`
          *,
          media_attachments (*)
        `)
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch notes: ${error.message}`);
      }

      // Filter notes that belong to OpenMind folder structure
      // This is a simplified approach - in production, you'd want to track folder membership
      return notes || [];
    } catch (error) {
      console.error('Error getting notes for date range:', error);
      return [];
    }
  }

  /**
   * Gets the days that have entries in a given month
   */
  async getDaysWithEntries(year: number, month: number, userId: string): Promise<string[]> {
    try {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      
      const notes = await this.getNotesForDateRange(startDate, endDate, userId);
      
      const days = new Set<string>();
      notes.forEach(note => {
        const date = new Date(note.created_at);
        days.add(date.toISOString().split('T')[0]);
      });
      
      return Array.from(days);
    } catch (error) {
      console.error('Error getting days with entries:', error);
      return [];
    }
  }

  /**
   * Gets the months that have entries in a given year
   */
  async getMonthsWithEntries(year: number, userId: string): Promise<number[]> {
    try {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year + 1, 0, 0);
      
      const notes = await this.getNotesForDateRange(startDate, endDate, userId);
      
      const months = new Set<number>();
      notes.forEach(note => {
        const date = new Date(note.created_at);
        months.add(date.getMonth());
      });
      
      return Array.from(months);
    } catch (error) {
      console.error('Error getting months with entries:', error);
      return [];
    }
  }
}

export const folderStructureManager = new FolderStructureManager();