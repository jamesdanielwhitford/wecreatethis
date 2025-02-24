// src/apps/bossbitch/services/data/dataService.ts
import { localStorageService } from './localStorageService';
import { firebaseService } from './firebaseService';
import { User } from 'firebase/auth';
import { UserGoals, UserPreferences, DailyEntry, MonthlyEntry } from './types';
import { IncomeSource } from '../../types/goal.types';

/**
 * Unified data service that uses Firebase for authenticated users
 * and falls back to localStorage for non-authenticated users.
 */
class DataService {
  private authStateListeners: ((isAuthenticated: boolean) => void)[] = [];
  private isAuthenticated = false;

  constructor() {
    // Listen to authentication state changes from Firebase
    firebaseService.onAuthStateChanged((user) => {
      const wasAuthenticated = this.isAuthenticated;
      this.isAuthenticated = !!user;

      // Notify listeners if authentication state changed
      if (wasAuthenticated !== this.isAuthenticated) {
        this.authStateListeners.forEach(listener => listener(this.isAuthenticated));
      }
    });
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
    return firebaseService.signIn(email, password);
  }

  async signUp(email: string, password: string): Promise<User> {
    return firebaseService.signUp(email, password);
  }

  async signOut(): Promise<void> {
    return firebaseService.signOut();
  }

  // Goals management
  async getGoals(): Promise<UserGoals> {
    if (this.isAuthenticated) {
      return firebaseService.getGoals();
    } else {
      return localStorageService.getGoals();
    }
  }

  async updateGoals(goals: Partial<UserGoals>): Promise<UserGoals> {
    if (this.isAuthenticated) {
      return firebaseService.updateGoals(goals);
    } else {
      return localStorageService.updateGoals(goals);
    }
  }

  // Preferences management
  async getPreferences(): Promise<UserPreferences> {
    if (this.isAuthenticated) {
      return firebaseService.getPreferences();
    } else {
      return localStorageService.getPreferences();
    }
  }

  async updatePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    if (this.isAuthenticated) {
      return firebaseService.updatePreferences(preferences);
    } else {
      return localStorageService.updatePreferences(preferences);
    }
  }

  // Daily entries
  async getDailyEntry(date: Date): Promise<DailyEntry | null> {
    if (this.isAuthenticated) {
      return firebaseService.getDailyEntry(date);
    } else {
      return localStorageService.getDailyEntry(date);
    }
  }

  async getDailyEntries(startDate: Date, endDate: Date): Promise<DailyEntry[]> {
    if (this.isAuthenticated) {
      return firebaseService.getDailyEntries(startDate, endDate);
    } else {
      return localStorageService.getDailyEntries(startDate, endDate);
    }
  }

  async addIncomeToDay(date: Date, amount: number, source: IncomeSource): Promise<DailyEntry> {
    if (this.isAuthenticated) {
      return firebaseService.addIncomeToDay(date, amount, source);
    } else {
      return localStorageService.addIncomeToDay(date, amount, source);
    }
  }

  async deleteDayEntry(date: Date): Promise<void> {
    if (this.isAuthenticated) {
      await firebaseService.deleteDayEntry(date);
    } else {
      await localStorageService.deleteDayEntry(date);
    }
  }

  // Monthly entries
  async getMonthlyEntry(year: number, month: number): Promise<MonthlyEntry | null> {
    if (this.isAuthenticated) {
      return firebaseService.getMonthlyEntry(year, month);
    } else {
      return localStorageService.getMonthlyEntry(year, month);
    }
  }

  async getMonthlyEntries(
    startYear: number, 
    startMonth: number, 
    endYear: number, 
    endMonth: number
  ): Promise<MonthlyEntry[]> {
    if (this.isAuthenticated) {
      return firebaseService.getMonthlyEntries(startYear, startMonth, endYear, endMonth);
    } else {
      return localStorageService.getMonthlyEntries(startYear, startMonth, endYear, endMonth);
    }
  }

  // Income sources management
  async getIncomeSources(): Promise<IncomeSource[]> {
    if (this.isAuthenticated) {
      return firebaseService.getIncomeSources();
    } else {
      return localStorageService.getIncomeSources();
    }
  }

  async addIncomeSource(source: IncomeSource): Promise<IncomeSource[]> {
    if (this.isAuthenticated) {
      return firebaseService.addIncomeSource(source);
    } else {
      return localStorageService.addIncomeSource(source);
    }
  }

  async updateIncomeSource(id: string, updates: Partial<Omit<IncomeSource, 'id'>>): Promise<IncomeSource[]> {
    if (this.isAuthenticated) {
      return firebaseService.updateIncomeSource(id, updates);
    } else {
      return localStorageService.updateIncomeSource(id, updates);
    }
  }

  // Data management
  async clearAllData(): Promise<void> {
    if (this.isAuthenticated) {
      return firebaseService.clearAllData();
    } else {
      return localStorageService.clearAllData();
    }
  }

  async exportData(): Promise<string> {
    if (this.isAuthenticated) {
      return firebaseService.exportData();
    } else {
      return localStorageService.exportData();
    }
  }

  async importData(jsonData: string): Promise<boolean> {
    if (this.isAuthenticated) {
      return firebaseService.importData(jsonData);
    } else {
      return localStorageService.importData(jsonData);
    }
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
}

// Create a singleton instance
export const dataService = new DataService();