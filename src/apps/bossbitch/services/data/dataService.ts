// src/apps/bossbitch/services/data/dataService.ts
import { localStorageService } from './localStorageService';
import { firebaseService } from './firebaseService';
import { User } from 'firebase/auth';
import { UserGoals, UserPreferences, DailyEntry, MonthlyEntry, UserData } from './types';
import { IncomeSource } from '../../types/goal.types';
import { OfflineManager } from './offlineManager';

// Interface definitions for type safety
interface IncomeData {
  amount?: number;
  source?: IncomeSource;
}

interface ImportData {
  jsonData?: string;
}

/**
 * Unified data service that uses Firebase for authenticated users
 * and falls back to localStorage for non-authenticated users.
 * Includes offline support and synchronization capabilities.
 */
class DataService {
  private authStateListeners: ((isAuthenticated: boolean) => void)[] = [];
  private isAuthenticated = false;
  private syncInProgress = false;

  constructor() {
    // Listen to authentication state changes from Firebase
    firebaseService.onAuthStateChanged((user) => {
      const wasAuthenticated = this.isAuthenticated;
      this.isAuthenticated = !!user;

      // Notify listeners if authentication state changed
      if (wasAuthenticated !== this.isAuthenticated) {
        this.authStateListeners.forEach(listener => listener(this.isAuthenticated));
      }

      // Try to sync offline data when coming back online
      if (this.isAuthenticated && OfflineManager.isOnline()) {
        this.syncOfflineData();
      }
    });

    // Set up online/offline event listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }

  // Auth state management
  onAuthStateChanged(callback: (isAuthenticated: boolean) => void) {
    this.authStateListeners.push(callback);
    callback(this.isAuthenticated);

    return () => {
      this.authStateListeners = this.authStateListeners.filter(listener => listener !== callback);
    };
  }

  getCurrentUser(): User | null {
    return firebaseService.getCurrentUser();
  }

  async signIn(email: string, password: string): Promise<User> {
    const user = await firebaseService.signIn(email, password);
    // After successful sign-in, try to sync any offline data
    await this.syncOfflineData();
    return user;
  }

  async signUp(email: string, password: string): Promise<User> {
    return firebaseService.signUp(email, password);
  }

  async signOut(): Promise<void> {
    return firebaseService.signOut();
  }

  // Generic method to handle operations with offline fallback
  // We need to convert specific data types to the expected UserData format for offline storage
  private async handleOfflineOperation<T, D = unknown>(
    operation: () => Promise<T>,
    fallback: () => Promise<T>,
    actionType: 'update' | 'add' | 'delete',
    path: string,
    data?: D
  ): Promise<T> {
    if (OfflineManager.isOnline()) {
      try {
        const result = await operation();
        return result;
      } catch (error) {
        console.error('Operation failed, falling back to offline mode:', error);
        await this.handleOfflineAction(actionType, path, this.convertToUserDataFormat(path, data));
        return fallback();
      }
    } else {
      await this.handleOfflineAction(actionType, path, this.convertToUserDataFormat(path, data));
      return fallback();
    }
  }
  
  // Convert various data types to the format expected by OfflineManager
  private convertToUserDataFormat<D = unknown>(path: string, data?: D): Partial<UserData> | undefined {
    if (!data) return undefined;
    
    // Create a partial UserData object with the appropriate structure based on the path
    if (path === 'goals') {
      return { goals: data as unknown as UserGoals };
    } else if (path === 'preferences') {
      return { preferences: data as unknown as UserPreferences };
    } else if (path.startsWith('dailyEntries/')) {
      const dateKey = path.split('/')[1];
      
      const typedData = data as unknown as IncomeData;
      if (typedData.amount !== undefined && typedData.source) {
        // This is income data that needs to be structured as a DailyEntry
        const dailyEntry: Record<string, DailyEntry> = {
          [dateKey]: {
            date: dateKey,
            progress: typedData.amount,
            segments: [typedData.source]
          }
        };
        return { dailyEntries: dailyEntry };
      }
    } else if (path === 'incomeSources') {
      return { incomeSources: Array.isArray(data) ? data as unknown as IncomeSource[] : [data as unknown as IncomeSource] };
    } else if (path.startsWith('incomeSources/')) {
      // For updating a specific income source, we need the ID
      const id = path.split('/')[1];
      // Create an array with one updated source
      const sourceWithUpdates = { id, ...(data as object) };
      return { incomeSources: [sourceWithUpdates as unknown as IncomeSource] };
    } else if (path === 'importData') {
      const importData = data as unknown as ImportData;
      if (importData.jsonData) {
        // For importing data, parse the JSON and return it directly
        try {
          return JSON.parse(importData.jsonData) as Partial<UserData>;
        } catch (e) {
          console.error('Failed to parse import data:', e);
        }
      }
    }
    
    // Default case - attempt to create an empty structure based on path
    if (path.includes('dailyEntries')) {
      return { dailyEntries: {} };
    } else if (path.includes('monthlyEntries')) {
      return { monthlyEntries: {} };
    }
    
    // If we can't determine the type, return an empty object
    // This shouldn't happen in practice if all paths are handled properly
    console.warn('Unknown data type for path:', path);
    return {};
  }
  
  private async handleOfflineAction(
    type: 'update' | 'add' | 'delete',
    path: string,
    data?: Partial<UserData>
  ) {
    await OfflineManager.storeOfflineAction({
      type,
      path,
      data
    });
  }

  // Goals management
  async getGoals(): Promise<UserGoals> {
    return this.handleOfflineOperation(
      async () => this.isAuthenticated ? await firebaseService.getGoals() : await localStorageService.getGoals(),
      async () => await localStorageService.getGoals(),
      'update',
      'goals',
      undefined
    );
  }

  async updateGoals(goals: Partial<UserGoals>): Promise<UserGoals> {
    return this.handleOfflineOperation(
      async () => this.isAuthenticated ? await firebaseService.updateGoals(goals) : await localStorageService.updateGoals(goals),
      async () => await localStorageService.updateGoals(goals),
      'update',
      'goals',
      goals
    );
  }

  // Preferences management
  async getPreferences(): Promise<UserPreferences> {
    return this.handleOfflineOperation(
      async () => this.isAuthenticated ? await firebaseService.getPreferences() : await localStorageService.getPreferences(),
      async () => await localStorageService.getPreferences(),
      'update',
      'preferences',
      undefined
    );
  }

  async updatePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    return this.handleOfflineOperation(
      async () => this.isAuthenticated ? await firebaseService.updatePreferences(preferences) : await localStorageService.updatePreferences(preferences),
      async () => await localStorageService.updatePreferences(preferences),
      'update',
      'preferences',
      preferences
    );
  }

  // Daily entries
  async getDailyEntry(date: Date): Promise<DailyEntry | null> {
    return this.handleOfflineOperation(
      async () => this.isAuthenticated ? await firebaseService.getDailyEntry(date) : await localStorageService.getDailyEntry(date),
      async () => await localStorageService.getDailyEntry(date),
      'update',
      `dailyEntries/${date.toISOString().split('T')[0]}`,
      undefined
    );
  }

  async getDailyEntries(startDate: Date, endDate: Date): Promise<DailyEntry[]> {
    return this.handleOfflineOperation(
      async () => this.isAuthenticated ? await firebaseService.getDailyEntries(startDate, endDate) : await localStorageService.getDailyEntries(startDate, endDate),
      async () => await localStorageService.getDailyEntries(startDate, endDate),
      'update',
      'dailyEntries',
      undefined
    );
  }

  async addIncomeToDay(date: Date, amount: number, source: IncomeSource): Promise<DailyEntry> {
    return this.handleOfflineOperation(
      async () => this.isAuthenticated ? await firebaseService.addIncomeToDay(date, amount, source) : await localStorageService.addIncomeToDay(date, amount, source),
      async () => await localStorageService.addIncomeToDay(date, amount, source),
      'add',
      `dailyEntries/${date.toISOString().split('T')[0]}`,
      { amount, source }
    );
  }

  async deleteDayEntry(date: Date): Promise<void> {
    return this.handleOfflineOperation(
      async () => this.isAuthenticated ? await firebaseService.deleteDayEntry(date) : await localStorageService.deleteDayEntry(date),
      async () => await localStorageService.deleteDayEntry(date),
      'delete',
      `dailyEntries/${date.toISOString().split('T')[0]}`,
      undefined
    );
  }

  // Monthly entries
  async getMonthlyEntry(year: number, month: number): Promise<MonthlyEntry | null> {
    return this.handleOfflineOperation(
      async () => this.isAuthenticated ? await firebaseService.getMonthlyEntry(year, month) : await localStorageService.getMonthlyEntry(year, month),
      async () => await localStorageService.getMonthlyEntry(year, month),
      'update',
      `monthlyEntries/${year}-${month}`,
      undefined
    );
  }

  async getMonthlyEntries(
    startYear: number,
    startMonth: number,
    endYear: number,
    endMonth: number
  ): Promise<MonthlyEntry[]> {
    return this.handleOfflineOperation(
      async () => this.isAuthenticated 
        ? await firebaseService.getMonthlyEntries(startYear, startMonth, endYear, endMonth)
        : await localStorageService.getMonthlyEntries(startYear, startMonth, endYear, endMonth),
      async () => await localStorageService.getMonthlyEntries(startYear, startMonth, endYear, endMonth),
      'update',
      'monthlyEntries',
      undefined
    );
  }

  // Income sources management
  async getIncomeSources(): Promise<IncomeSource[]> {
    return this.handleOfflineOperation(
      async () => this.isAuthenticated ? await firebaseService.getIncomeSources() : await localStorageService.getIncomeSources(),
      async () => await localStorageService.getIncomeSources(),
      'update',
      'incomeSources',
      undefined
    );
  }

  async addIncomeSource(source: IncomeSource): Promise<IncomeSource[]> {
    return this.handleOfflineOperation(
      async () => this.isAuthenticated ? await firebaseService.addIncomeSource(source) : await localStorageService.addIncomeSource(source),
      async () => await localStorageService.addIncomeSource(source),
      'add',
      'incomeSources',
      source
    );
  }

  async updateIncomeSource(id: string, updates: Partial<Omit<IncomeSource, 'id'>>): Promise<IncomeSource[]> {
    return this.handleOfflineOperation(
      async () => this.isAuthenticated ? await firebaseService.updateIncomeSource(id, updates) : await localStorageService.updateIncomeSource(id, updates),
      async () => await localStorageService.updateIncomeSource(id, updates),
      'update',
      `incomeSources/${id}`,
      updates
    );
  }

  // Data management
  async clearAllData(): Promise<void> {
    if (this.isAuthenticated) {
      await firebaseService.clearAllData();
    }
    await localStorageService.clearAllData();
    await OfflineManager.clearOfflineQueue();
    await OfflineManager.clearOfflineData();
  }

  async exportData(): Promise<string> {
    if (this.isAuthenticated) {
      return firebaseService.exportData();
    }
    return localStorageService.exportData();
  }

  async importData(jsonData: string): Promise<boolean> {
    return this.handleOfflineOperation(
      async () => this.isAuthenticated ? await firebaseService.importData(jsonData) : await localStorageService.importData(jsonData),
      async () => await localStorageService.importData(jsonData),
      'update',
      'importData',
      { jsonData }
    );
  }

  // Migration utilities
  async migrateLocalToFirebase(): Promise<boolean> {
    if (!this.isAuthenticated) {
      throw new Error('User must be authenticated to migrate data');
    }

    try {
      // Export local data
      const localData = localStorageService.exportData();
      
      // Import into Firebase
      await firebaseService.importData(localData);
      
      // Clear local data
      localStorageService.clearAllData();
      
      return true;
    } catch (error) {
      console.error('Error migrating data:', error);
      return false;
    }
  }

  // Offline synchronization
  private async handleOnline() {
    if (this.isAuthenticated) {
      await this.syncOfflineData();
    }
    // Notify any listeners that we're back online
    window.dispatchEvent(new CustomEvent('app-online'));
  }

  private handleOffline() {
    // Notify any listeners that we're offline
    window.dispatchEvent(new CustomEvent('app-offline'));
  }

  async syncOfflineData(): Promise<void> {
    if (!this.isAuthenticated || !OfflineManager.isOnline() || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;
    try {
      const queue = await OfflineManager.getOfflineQueue();
      for (const action of queue) {
        try {
          switch (action.type) {
            case 'add':
              if (action.path.includes('dailyEntries')) {
                // Extract the daily entry data from the UserData structure
                const dateKey = action.path.split('/')[1];
                const dailyEntry = action.data?.dailyEntries?.[dateKey];
                
                if (dailyEntry && dailyEntry.segments && dailyEntry.segments.length > 0) {
                  const source = dailyEntry.segments[0];
                  await firebaseService.addIncomeToDay(
                    new Date(dateKey),
                    dailyEntry.progress,
                    source
                  );
                }
              } else if (action.path.includes('incomeSources') && action.data?.incomeSources) {
                // Handle adding income sources
                for (const source of action.data.incomeSources) {
                  await firebaseService.addIncomeSource(source);
                }
              }
              break;
            case 'update':
              if (action.path === 'goals' && action.data?.goals) {
                await firebaseService.updateGoals(action.data.goals);
              } else if (action.path === 'preferences' && action.data?.preferences) {
                await firebaseService.updatePreferences(action.data.preferences);
              } else if (action.path.includes('incomeSources/') && action.data?.incomeSources) {
                // Handle updating a specific income source
                const id = action.path.split('/')[1];
                const source = action.data.incomeSources.find(s => s.id === id);
                if (source) {
                  const { id: sourceId, ...updates } = source;
                  await firebaseService.updateIncomeSource(sourceId, updates);
                }
              }
              break;
            case 'delete':
              if (action.path.includes('dailyEntries')) {
                await firebaseService.deleteDayEntry(
                  new Date(action.path.split('/')[1])
                );
              }
              break;
          }
          await OfflineManager.removeOfflineAction(action.id);
        } catch (error) {
          console.error('Error syncing action:', error);
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  // Network status
  isOnline(): boolean {
    return OfflineManager.isOnline();
  }

  onOnline(callback: () => void) {
    const handler = () => callback();
    window.addEventListener('app-online', handler);
    return () => window.removeEventListener('app-online', handler);
  }

  onOffline(callback: () => void) {
    const handler = () => callback();
    window.addEventListener('app-offline', handler);
    return () => window.removeEventListener('app-offline', handler);
  }
}

// Create a singleton instance
export const dataService = new DataService();