// src/apps/bossbitch/services/data/dataService.ts
import { localStorageService } from './localStorageService';
import { firebaseService } from './firebaseService';
import { User } from 'firebase/auth';
import { UserGoals, UserPreferences, DailyEntry, MonthlyEntry } from './types';
import { IncomeSource } from '../../types/goal.types';
import { OfflineManager } from './offlineManager';

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

  // Offline operation handler
  private async handleOfflineOperation<T>(
    operation: () => Promise<T>,
    fallback: () => Promise<T>,
    actionType: 'update' | 'add' | 'delete',
    path: string,
    data?: any
  ): Promise<T> {
    if (OfflineManager.isOnline()) {
      try {
        const result = await operation();
        return result;
      } catch (error) {
        console.error('Operation failed, falling back to offline mode:', error);
        await this.handleOfflineAction(actionType, path, data);
        return fallback();
      }
    } else {
      await this.handleOfflineAction(actionType, path, data);
      return fallback();
    }
  }

  private async handleOfflineAction(
    type: 'update' | 'add' | 'delete',
    path: string,
    data?: any
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
      () => this.isAuthenticated ? firebaseService.getGoals() : localStorageService.getGoals(),
      () => localStorageService.getGoals(),
      'update',
      'goals',
      null
    );
  }

  async updateGoals(goals: Partial<UserGoals>): Promise<UserGoals> {
    return this.handleOfflineOperation(
      () => this.isAuthenticated ? firebaseService.updateGoals(goals) : localStorageService.updateGoals(goals),
      () => localStorageService.updateGoals(goals),
      'update',
      'goals',
      goals
    );
  }

  // Preferences management
  async getPreferences(): Promise<UserPreferences> {
    return this.handleOfflineOperation(
      () => this.isAuthenticated ? firebaseService.getPreferences() : localStorageService.getPreferences(),
      () => localStorageService.getPreferences(),
      'update',
      'preferences',
      null
    );
  }

  async updatePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    return this.handleOfflineOperation(
      () => this.isAuthenticated ? firebaseService.updatePreferences(preferences) : localStorageService.updatePreferences(preferences),
      () => localStorageService.updatePreferences(preferences),
      'update',
      'preferences',
      preferences
    );
  }

  // Daily entries
  async getDailyEntry(date: Date): Promise<DailyEntry | null> {
    return this.handleOfflineOperation(
      () => this.isAuthenticated ? firebaseService.getDailyEntry(date) : localStorageService.getDailyEntry(date),
      () => localStorageService.getDailyEntry(date),
      'update',
      `dailyEntries/${date.toISOString().split('T')[0]}`,
      null
    );
  }

  async getDailyEntries(startDate: Date, endDate: Date): Promise<DailyEntry[]> {
    return this.handleOfflineOperation(
      () => this.isAuthenticated ? firebaseService.getDailyEntries(startDate, endDate) : localStorageService.getDailyEntries(startDate, endDate),
      () => localStorageService.getDailyEntries(startDate, endDate),
      'update',
      'dailyEntries',
      null
    );
  }

  async addIncomeToDay(date: Date, amount: number, source: IncomeSource): Promise<DailyEntry> {
    return this.handleOfflineOperation(
      () => this.isAuthenticated ? firebaseService.addIncomeToDay(date, amount, source) : localStorageService.addIncomeToDay(date, amount, source),
      () => localStorageService.addIncomeToDay(date, amount, source),
      'add',
      `dailyEntries/${date.toISOString().split('T')[0]}`,
      { amount, source }
    );
  }

  async deleteDayEntry(date: Date): Promise<void> {
    return this.handleOfflineOperation(
      () => this.isAuthenticated ? firebaseService.deleteDayEntry(date) : localStorageService.deleteDayEntry(date),
      () => localStorageService.deleteDayEntry(date),
      'delete',
      `dailyEntries/${date.toISOString().split('T')[0]}`,
      null
    );
  }

  // Monthly entries
  async getMonthlyEntry(year: number, month: number): Promise<MonthlyEntry | null> {
    return this.handleOfflineOperation(
      () => this.isAuthenticated ? firebaseService.getMonthlyEntry(year, month) : localStorageService.getMonthlyEntry(year, month),
      () => localStorageService.getMonthlyEntry(year, month),
      'update',
      `monthlyEntries/${year}-${month}`,
      null
    );
  }

  async getMonthlyEntries(
    startYear: number,
    startMonth: number,
    endYear: number,
    endMonth: number
  ): Promise<MonthlyEntry[]> {
    return this.handleOfflineOperation(
      () => this.isAuthenticated 
        ? firebaseService.getMonthlyEntries(startYear, startMonth, endYear, endMonth)
        : localStorageService.getMonthlyEntries(startYear, startMonth, endYear, endMonth),
      () => localStorageService.getMonthlyEntries(startYear, startMonth, endYear, endMonth),
      'update',
      'monthlyEntries',
      null
    );
  }

  // Income sources management
  async getIncomeSources(): Promise<IncomeSource[]> {
    return this.handleOfflineOperation(
      () => this.isAuthenticated ? firebaseService.getIncomeSources() : localStorageService.getIncomeSources(),
      () => localStorageService.getIncomeSources(),
      'update',
      'incomeSources',
      null
    );
  }

  async addIncomeSource(source: IncomeSource): Promise<IncomeSource[]> {
    return this.handleOfflineOperation(
      () => this.isAuthenticated ? firebaseService.addIncomeSource(source) : localStorageService.addIncomeSource(source),
      () => localStorageService.addIncomeSource(source),
      'add',
      'incomeSources',
      source
    );
  }

  async updateIncomeSource(id: string, updates: Partial<Omit<IncomeSource, 'id'>>): Promise<IncomeSource[]> {
    return this.handleOfflineOperation(
      () => this.isAuthenticated ? firebaseService.updateIncomeSource(id, updates) : localStorageService.updateIncomeSource(id, updates),
      () => localStorageService.updateIncomeSource(id, updates),
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
      () => this.isAuthenticated ? firebaseService.importData(jsonData) : localStorageService.importData(jsonData),
      () => localStorageService.importData(jsonData),
      'update',
      'importData',
      jsonData
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
                const data = action.data;
                await firebaseService.addIncomeToDay(
                  new Date(action.path.split('/')[1]),
                  data.amount,
                  data.source
                );
              }
              break;
            case 'update':
              if (action.path === 'goals') {
                await firebaseService.updateGoals(action.data);
              } else if (action.path === 'preferences') {
                await firebaseService.updatePreferences(action.data);
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