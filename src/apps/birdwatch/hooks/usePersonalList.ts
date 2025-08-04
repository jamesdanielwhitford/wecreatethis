import { useState, useEffect, useCallback } from 'react';
import { PersonalBirdEntry, Bird } from '../types/bird.types';
import { birdEntriesService, isSupabaseConfigured } from '../utils/supabase';
import { useAuth } from './useAuth';

const STORAGE_KEY = 'birdwatch_personal_list';

export function usePersonalList() {
  const [personalBirds, setPersonalBirds] = useState<PersonalBirdEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { user, isAuthenticated, isConfigured } = useAuth();

  useEffect(() => {
    const loadData = async () => {
      try {
        if (isConfigured && isAuthenticated && user) {
          // Load from Supabase if authenticated
          const supabaseEntries = await birdEntriesService.getUserBirdEntries(user.id);
          setPersonalBirds(supabaseEntries);
          
          // Also check if there's local data to sync
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const localEntries = JSON.parse(stored);
            if (localEntries.length > 0) {
              setSyncing(true);
              try {
                await birdEntriesService.syncLocalData(user.id, localEntries);
                // Reload data after sync
                const updatedEntries = await birdEntriesService.getUserBirdEntries(user.id);
                setPersonalBirds(updatedEntries);
                // Clear local storage after successful sync
                localStorage.removeItem(STORAGE_KEY);
              } catch (syncError) {
                console.error('Error syncing local data:', syncError);
              } finally {
                setSyncing(false);
              }
            }
          }
        } else {
          // Load from localStorage if not authenticated
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            setPersonalBirds(parsed);
          }
        }
      } catch (error) {
        console.error('Error loading personal bird list:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isConfigured, isAuthenticated, user]);

  const saveToStorage = useCallback((birds: PersonalBirdEntry[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(birds));
    } catch (error) {
      console.error('Error saving personal bird list:', error);
    }
  }, []);

  const addBird = useCallback(async (bird: Bird, location?: string, notes?: string, photos?: string[]) => {
    const newEntry: PersonalBirdEntry = {
      id: `${bird.id}-${Date.now()}`,
      bird,
      dateSpotted: new Date().toISOString(),
      location,
      notes,
      photos: photos || []
    };

    if (isConfigured && isAuthenticated && user) {
      try {
        // Save to Supabase
        const savedEntry = await birdEntriesService.createBirdEntry(user.id, newEntry);
        setPersonalBirds(prev => [savedEntry, ...prev]);
        return savedEntry;
      } catch (error) {
        console.error('Error saving to Supabase, falling back to local storage:', error);
        // Fall back to local storage
        setPersonalBirds(prev => {
          const updated = [newEntry, ...prev];
          saveToStorage(updated);
          return updated;
        });
        return newEntry;
      }
    } else {
      // Save to local storage
      setPersonalBirds(prev => {
        const updated = [newEntry, ...prev];
        saveToStorage(updated);
        return updated;
      });
      return newEntry;
    }
  }, [saveToStorage, isConfigured, isAuthenticated, user]);

  const removeBird = useCallback(async (entryId: string) => {
    if (isConfigured && isAuthenticated && user) {
      try {
        await birdEntriesService.deleteBirdEntry(entryId);
        setPersonalBirds(prev => prev.filter(entry => entry.id !== entryId));
      } catch (error) {
        console.error('Error deleting from Supabase:', error);
        // Still remove from local state to provide feedback
        setPersonalBirds(prev => prev.filter(entry => entry.id !== entryId));
      }
    } else {
      setPersonalBirds(prev => {
        const updated = prev.filter(entry => entry.id !== entryId);
        saveToStorage(updated);
        return updated;
      });
    }
  }, [saveToStorage, isConfigured, isAuthenticated, user]);

  const updateBird = useCallback(async (entryId: string, updates: Partial<PersonalBirdEntry>) => {
    if (isConfigured && isAuthenticated && user) {
      try {
        const updatedEntry = await birdEntriesService.updateBirdEntry(entryId, updates);
        setPersonalBirds(prev => prev.map(entry => 
          entry.id === entryId ? updatedEntry : entry
        ));
      } catch (error) {
        console.error('Error updating in Supabase:', error);
        // Fall back to local update
        setPersonalBirds(prev => {
          const updated = prev.map(entry => 
            entry.id === entryId 
              ? { ...entry, ...updates }
              : entry
          );
          saveToStorage(updated);
          return updated;
        });
      }
    } else {
      setPersonalBirds(prev => {
        const updated = prev.map(entry => 
          entry.id === entryId 
            ? { ...entry, ...updates }
            : entry
        );
        saveToStorage(updated);
        return updated;
      });
    }
  }, [saveToStorage, isConfigured, isAuthenticated, user]);

  const getBirdsByOrder = useCallback((order: 'chronological' | 'alphabetical') => {
    return [...personalBirds].sort((a, b) => {
      if (order === 'chronological') {
        return new Date(b.dateSpotted).getTime() - new Date(a.dateSpotted).getTime();
      } else {
        const nameA = a.bird.preferred_common_name || a.bird.name;
        const nameB = b.bird.preferred_common_name || b.bird.name;
        return nameA.localeCompare(nameB);
      }
    });
  }, [personalBirds]);

  const hasBird = useCallback((birdId: number) => {
    return personalBirds.some(entry => entry.bird.id === birdId);
  }, [personalBirds]);

  const getBirdCount = useCallback(() => {
    return personalBirds.length;
  }, [personalBirds]);

  const getUniqueSpeciesCount = useCallback(() => {
    const uniqueIds = new Set(personalBirds.map(entry => entry.bird.id));
    return uniqueIds.size;
  }, [personalBirds]);

  return {
    personalBirds,
    loading,
    syncing,
    isAuthenticated,
    isConfigured,
    addBird,
    removeBird,
    updateBird,
    getBirdsByOrder,
    hasBird,
    getBirdCount,
    getUniqueSpeciesCount
  };
}