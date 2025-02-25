// src/apps/bossbitch/services/data/localStorageService.ts
import { UserGoals, UserPreferences, DailyEntry, MonthlyEntry, getEntryKey } from './types';
import { IncomeSource } from '../../types/goal.types';

// Default values
const DEFAULT_GOALS: UserGoals = {
  daily: 1000,
  monthly: 20000
};

const DEFAULT_PREFERENCES: UserPreferences = {
  colors: {
    dailyRing: '#FF6B6B',
    monthlyRing: '#7C3AED',
    accent: '#4ECDC4'
  },
  showCelebrations: true,
  currency: 'ZAR'
};

/**
 * Service for interacting with browser localStorage.
 * Used as a fallback for non-authenticated users or when offline.
 */
class LocalStorageService {
  // Goals management
  async getGoals(): Promise<UserGoals> {
    try {
      const goalsJson = localStorage.getItem('bossbitch-goals');
      if (!goalsJson) {
        return DEFAULT_GOALS;
      }
      return JSON.parse(goalsJson) as UserGoals;
    } catch (error) {
      console.error('Error getting goals from localStorage:', error);
      return DEFAULT_GOALS;
    }
  }

  async updateGoals(goals: Partial<UserGoals>): Promise<UserGoals> {
    try {
      const currentGoals = await this.getGoals();
      const updatedGoals = { ...currentGoals, ...goals };
      localStorage.setItem('bossbitch-goals', JSON.stringify(updatedGoals));
      return updatedGoals;
    } catch (error) {
      console.error('Error updating goals in localStorage:', error);
      throw error;
    }
  }

  // Preferences management
  async getPreferences(): Promise<UserPreferences> {
    try {
      const prefsJson = localStorage.getItem('bossbitch-preferences');
      if (!prefsJson) {
        return DEFAULT_PREFERENCES;
      }
      return JSON.parse(prefsJson) as UserPreferences;
    } catch (error) {
      console.error('Error getting preferences from localStorage:', error);
      return DEFAULT_PREFERENCES;
    }
  }

  async updatePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      const currentPrefs = await this.getPreferences();
      // Deep merge for nested objects like colors
      const updatedPrefs = {
        ...currentPrefs,
        ...preferences,
        colors: preferences.colors 
          ? { ...currentPrefs.colors, ...preferences.colors }
          : currentPrefs.colors
      };
      localStorage.setItem('bossbitch-preferences', JSON.stringify(updatedPrefs));
      return updatedPrefs;
    } catch (error) {
      console.error('Error updating preferences in localStorage:', error);
      throw error;
    }
  }

  // Daily entries
  async getDailyEntry(date: Date): Promise<DailyEntry | null> {
    try {
      const dateKey = getEntryKey(date);
      const entryJson = localStorage.getItem(`bossbitch-daily-${dateKey}`);
      
      if (!entryJson) {
        return null;
      }
      
      return JSON.parse(entryJson) as DailyEntry;
    } catch (error) {
      console.error('Error getting daily entry from localStorage:', error);
      return null;
    }
  }

  async getDailyEntries(startDate: Date, endDate: Date): Promise<DailyEntry[]> {
    try {
      const entries: DailyEntry[] = [];
      
      // Iterate through each day in the range
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const entry = await this.getDailyEntry(currentDate);
        if (entry) {
          entries.push(entry);
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return entries;
    } catch (error) {
      console.error('Error getting daily entries from localStorage:', error);
      return [];
    }
  }

  async addIncomeToDay(date: Date, amount: number, source: IncomeSource): Promise<DailyEntry> {
    try {
      const dateKey = getEntryKey(date);
      const storageKey = `bossbitch-daily-${dateKey}`;
      
      // Get existing entry or create a new one
      const existingEntry = await this.getDailyEntry(date) || {
        date: dateKey,
        progress: 0,
        segments: []
      };
      
      // Update the entry
      const updatedEntry: DailyEntry = {
        ...existingEntry,
        progress: existingEntry.progress + amount,
        segments: [...existingEntry.segments, { ...source, value: amount }]
      };
      
      // Save to localStorage
      localStorage.setItem(storageKey, JSON.stringify(updatedEntry));
      
      return updatedEntry;
    } catch (error) {
      console.error('Error adding income to day in localStorage:', error);
      throw error;
    }
  }

  // Update specific fields of a daily entry
  async updateDayEntry(date: Date, updates: Partial<DailyEntry>): Promise<DailyEntry> {
    const dateKey = getEntryKey(date);
    const storageKey = `bossbitch-daily-${dateKey}`;
    
    try {
      // Get the existing entry
      const existingEntry = await this.getDailyEntry(date);
      
      // If no entry exists, throw an error
      if (!existingEntry) {
        throw new Error(`No entry exists for date ${dateKey}`);
      }
      
      // Merge the updates with the existing entry
      const updatedEntry = {
        ...existingEntry,
        ...updates
      };
      
      // Save the updated entry
      localStorage.setItem(storageKey, JSON.stringify(updatedEntry));
      
      return updatedEntry;
    } catch (error) {
      console.error(`Error updating daily entry for ${dateKey}:`, error);
      throw error;
    }
  }

  async deleteDayEntry(date: Date): Promise<void> {
    try {
      const dateKey = getEntryKey(date);
      localStorage.removeItem(`bossbitch-daily-${dateKey}`);
    } catch (error) {
      console.error('Error deleting day entry from localStorage:', error);
      throw error;
    }
  }

  // Monthly entries
  async getMonthlyEntry(year: number, month: number): Promise<MonthlyEntry | null> {
    try {
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
      const entryJson = localStorage.getItem(`bossbitch-monthly-${monthKey}`);
      
      if (!entryJson) {
        return null;
      }
      
      return JSON.parse(entryJson) as MonthlyEntry;
    } catch (error) {
      console.error('Error getting monthly entry from localStorage:', error);
      return null;
    }
  }

  async getMonthlyEntries(
    startYear: number,
    startMonth: number,
    endYear: number,
    endMonth: number
  ): Promise<MonthlyEntry[]> {
    try {
      const entries: MonthlyEntry[] = [];
      
      // Iterate through each month in the range
      for (let year = startYear; year <= endYear; year++) {
        const monthStart = year === startYear ? startMonth : 0;
        const monthEnd = year === endYear ? endMonth : 11;
        
        for (let month = monthStart; month <= monthEnd; month++) {
          const entry = await this.getMonthlyEntry(year, month);
          if (entry) {
            entries.push(entry);
          }
        }
      }
      
      return entries;
    } catch (error) {
      console.error('Error getting monthly entries from localStorage:', error);
      return [];
    }
  }

  // Income sources
  async getIncomeSources(): Promise<IncomeSource[]> {
    try {
      const sourcesJson = localStorage.getItem('bossbitch-income-sources');
      if (!sourcesJson) {
        return [];
      }
      return JSON.parse(sourcesJson) as IncomeSource[];
    } catch (error) {
      console.error('Error getting income sources from localStorage:', error);
      return [];
    }
  }

  async addIncomeSource(source: IncomeSource): Promise<IncomeSource[]> {
    try {
      const sources = await this.getIncomeSources();
      
      // Check if source with this ID already exists
      const existingIndex = sources.findIndex(s => s.id === source.id);
      if (existingIndex >= 0) {
        // Update existing source
        sources[existingIndex] = source;
      } else {
        // Add new source
        sources.push(source);
      }
      
      localStorage.setItem('bossbitch-income-sources', JSON.stringify(sources));
      return sources;
    } catch (error) {
      console.error('Error adding income source to localStorage:', error);
      throw error;
    }
  }

  async updateIncomeSource(id: string, updates: Partial<Omit<IncomeSource, 'id'>>): Promise<IncomeSource[]> {
    try {
      const sources = await this.getIncomeSources();
      
      // Find the source to update
      const sourceIndex = sources.findIndex(source => source.id === id);
      if (sourceIndex === -1) {
        throw new Error(`Income source with id ${id} not found`);
      }
      
      // Update the source
      sources[sourceIndex] = {
        ...sources[sourceIndex],
        ...updates
      };
      
      // Save to localStorage
      localStorage.setItem('bossbitch-income-sources', JSON.stringify(sources));
      
      return sources;
    } catch (error) {
      console.error('Error updating income source in localStorage:', error);
      throw error;
    }
  }

  // Data management
  async clearAllData(): Promise<void> {
    try {
      // Get all keys that start with 'bossbitch-'
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('bossbitch-')) {
          keysToRemove.push(key);
        }
      }
      
      // Remove all keys
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Add default values back
      localStorage.setItem('bossbitch-goals', JSON.stringify(DEFAULT_GOALS));
      localStorage.setItem('bossbitch-preferences', JSON.stringify(DEFAULT_PREFERENCES));
    } catch (error) {
      console.error('Error clearing data from localStorage:', error);
      throw error;
    }
  }

  async exportData(): Promise<string> {
    try {
      // Get all keys that start with 'bossbitch-'
      const dataToExport: Record<string, any> = {};
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('bossbitch-')) {
          try {
            // Parse the value to get the actual object
            const value = JSON.parse(localStorage.getItem(key) || '');
            
            // Store with a normalized key (remove prefix)
            const normalizedKey = key.replace('bossbitch-', '');
            dataToExport[normalizedKey] = value;
          } catch (e) {
            console.warn(`Could not parse item at ${key}, skipping`);
          }
        }
      }
      
      // Convert to JSON
      return JSON.stringify({
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        data: dataToExport
      });
    } catch (error) {
      console.error('Error exporting data from localStorage:', error);
      throw error;
    }
  }

  async importData(jsonData: string): Promise<boolean> {
    try {
      // Parse the imported data
      const imported = JSON.parse(jsonData);
      
      if (!imported || !imported.data) {
        throw new Error('Invalid import data format');
      }
      
      // First clear existing data
      await this.clearAllData();
      
      // Import each key-value pair
      Object.entries(imported.data).forEach(([key, value]) => {
        const storageKey = `bossbitch-${key}`;
        localStorage.setItem(storageKey, JSON.stringify(value));
      });
      
      return true;
    } catch (error) {
      console.error('Error importing data to localStorage:', error);
      return false;
    }
  }
}

// Create a singleton instance
export const localStorageService = new LocalStorageService();