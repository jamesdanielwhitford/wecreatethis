import { createClient } from '@supabase/supabase-js';
import { PersonalBirdEntry } from '../types/bird.types';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_BIRD_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_BIRD_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
  return supabaseUrl && supabaseAnonKey;
};

// Authentication helpers
export const authService = {
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
};

// Photo storage service
export const photoService = {
  async uploadPhoto(userId: string, photo: string, birdId: number): Promise<string> {
    try {
      // Convert base64 to blob
      const response = await fetch(photo);
      const blob = await response.blob();
      
      // Generate unique file name
      const fileName = `${userId}/birds/${birdId}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      
      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('bird-photos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg'
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('bird-photos')
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      throw error;
    }
  },

  async deletePhoto(photoUrl: string): Promise<void> {
    try {
      // Extract path from URL
      const url = new URL(photoUrl);
      const path = url.pathname.split('/storage/v1/object/public/bird-photos/')[1];
      
      if (path) {
        const { error } = await supabase.storage
          .from('bird-photos')
          .remove([path]);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
      throw error;
    }
  }
};

// Bird entries database service
export const birdEntriesService = {
  async getUserBirdEntries(userId: string): Promise<PersonalBirdEntry[]> {
    const { data, error } = await supabase
      .from('bird_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(entry => ({
      ...entry,
      bird: JSON.parse(entry.bird_data),
      dateSpotted: entry.date_spotted,
      photos: entry.photos || []
    }));
  },

  async createBirdEntry(userId: string, entry: Omit<PersonalBirdEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<PersonalBirdEntry> {
    // Upload photos if they're base64 strings
    let uploadedPhotos: string[] = [];
    if (entry.photos && entry.photos.length > 0) {
      for (const photo of entry.photos) {
        if (photo.startsWith('data:')) {
          // This is a base64 photo, upload it
          const uploadedUrl = await photoService.uploadPhoto(userId, photo, entry.bird.id);
          uploadedPhotos.push(uploadedUrl);
        } else {
          // This is already a URL
          uploadedPhotos.push(photo);
        }
      }
    }

    const entryData = {
      user_id: userId,
      bird_data: JSON.stringify(entry.bird),
      date_spotted: entry.dateSpotted,
      location: entry.location,
      notes: entry.notes,
      photos: uploadedPhotos
    };

    const { data, error } = await supabase
      .from('bird_entries')
      .insert([entryData])
      .select()
      .single();

    if (error) throw error;

    return {
      ...data,
      bird: JSON.parse(data.bird_data),
      dateSpotted: data.date_spotted,
      photos: data.photos || []
    };
  },

  async updateBirdEntry(entryId: string, updates: Partial<PersonalBirdEntry>): Promise<PersonalBirdEntry> {
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (updates.location !== undefined) updateData.location = updates.location;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.dateSpotted !== undefined) updateData.date_spotted = updates.dateSpotted;
    if (updates.photos !== undefined) updateData.photos = updates.photos;

    const { data, error } = await supabase
      .from('bird_entries')
      .update(updateData)
      .eq('id', entryId)
      .select()
      .single();

    if (error) throw error;

    return {
      ...data,
      bird: JSON.parse(data.bird_data),
      dateSpotted: data.date_spotted,
      photos: data.photos || []
    };
  },

  async deleteBirdEntry(entryId: string): Promise<void> {
    // Get the entry first to clean up photos
    const { data: entry } = await supabase
      .from('bird_entries')
      .select('photos')
      .eq('id', entryId)
      .single();

    // Delete photos from storage
    if (entry?.photos && entry.photos.length > 0) {
      for (const photoUrl of entry.photos) {
        try {
          await photoService.deletePhoto(photoUrl);
        } catch (error) {
          console.error('Error deleting photo:', error);
          // Continue with deletion even if photo cleanup fails
        }
      }
    }

    // Delete the entry
    const { error } = await supabase
      .from('bird_entries')
      .delete()
      .eq('id', entryId);

    if (error) throw error;
  },

  // Sync local storage data to Supabase
  async syncLocalData(userId: string, localEntries: PersonalBirdEntry[]): Promise<void> {
    if (!localEntries.length) return;

    // Get existing entries from Supabase
    const existingEntries = await this.getUserBirdEntries(userId);
    const existingIds = new Set(existingEntries.map(e => e.id));

    // Upload new entries that don't exist in Supabase
    const newEntries = localEntries.filter(entry => !existingIds.has(entry.id));
    
    for (const entry of newEntries) {
      try {
        await this.createBirdEntry(userId, entry);
      } catch (error) {
        console.error('Error syncing entry:', error);
        // Continue with other entries
      }
    }
  }
};

// Helper to check if user is authenticated
export const requireAuth = async () => {
  const user = await authService.getCurrentUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
};