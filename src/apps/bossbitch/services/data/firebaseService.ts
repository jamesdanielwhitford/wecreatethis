// src/apps/bossbitch/services/data/firebaseService.ts
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  // Removed unused imports
  serverTimestamp
} from 'firebase/firestore';
import { UserGoals, UserPreferences, DailyEntry, MonthlyEntry, getEntryKey } from './types';
import { IncomeSource } from '../../types/goal.types';

// Default values
const DEFAULT_GOALS: UserGoals = {
  dailyGoal: 1000,
  monthlyGoal: 20000,
  activeDays: [false, true, true, true, true, true, false] // Mon-Fri are active
};

const DEFAULT_PREFERENCES: UserPreferences = {
  isDarkMode: true,
  colors: {
    dailyRing: '#FF6B6B',
    monthlyRing: '#7C3AED',
    accent: '#4ECDC4'
  }
};

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

/**
 * Service for interacting with Firebase authentication and Firestore.
 * Used for authenticated users.
 */
class FirebaseService {
  private app;
  private auth;
  private db;
  
  constructor() {
    // Initialize Firebase only if we're in a browser environment
    if (typeof window !== 'undefined') {
      // Initialize with default or environment variables
      this.app = initializeApp(firebaseConfig);
      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);
    }
  }
  
  // Auth methods
  onAuthStateChanged(callback: (user: User | null) => void) {
    if (!this.auth) return () => {};
    
    return firebaseOnAuthStateChanged(this.auth, callback);
  }
  
  getCurrentUser(): User | null {
    if (!this.auth) return null;
    return this.auth.currentUser;
  }
  
  async signIn(email: string, password: string): Promise<User> {
    if (!this.auth) throw new Error('Firebase Auth not initialized');
    
    try {
      const result = await signInWithEmailAndPassword(this.auth, email, password);
      return result.user;
    } catch (error: unknown) {
      console.error('Firebase sign in error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Authentication failed: ${errorMessage}`);
    }
  }
  
  async signUp(email: string, password: string): Promise<User> {
    if (!this.auth) throw new Error('Firebase Auth not initialized');
    
    try {
      const result = await createUserWithEmailAndPassword(this.auth, email, password);
      
      // Create initial user data in Firestore
      await this.initializeUserData(result.user.uid);
      
      return result.user;
    } catch (error: unknown) {
      console.error('Firebase sign up error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Registration failed: ${errorMessage}`);
    }
  }
  
  async signOut(): Promise<void> {
    if (!this.auth) throw new Error('Firebase Auth not initialized');
    
    try {
      await firebaseSignOut(this.auth);
    } catch (error: unknown) {
      console.error('Firebase sign out error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Sign out failed: ${errorMessage}`);
    }
  }
  
  // Initialize user data in Firestore
  private async initializeUserData(userId: string): Promise<void> {
    if (!this.db) throw new Error('Firestore not initialized');
    
    try {
      // Create user document with default values
      const userDoc = doc(this.db, 'users', userId);
      await setDoc(userDoc, {
        createdAt: serverTimestamp(),
        email: this.auth?.currentUser?.email
      });
      
      // Create default goals document
      const goalsDoc = doc(this.db, 'users', userId, 'settings', 'goals');
      await setDoc(goalsDoc, {
        ...DEFAULT_GOALS,
        updatedAt: serverTimestamp()
      });
      
      // Create default preferences document
      const prefsDoc = doc(this.db, 'users', userId, 'settings', 'preferences');
      await setDoc(prefsDoc, {
        ...DEFAULT_PREFERENCES,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error initializing user data:', error);
      throw error;
    }
  }
  
  // Goals management
  async getGoals(): Promise<UserGoals> {
    if (!this.db) throw new Error('Firestore not initialized');
    
    const userId = this.getCurrentUser()?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    try {
      const goalsDoc = doc(this.db, 'users', userId, 'settings', 'goals');
      const docSnap = await getDoc(goalsDoc);
      
      if (docSnap.exists()) {
        // Use the data without the timestamp
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { updatedAt, ...goals } = docSnap.data();
        return goals as UserGoals;
      } else {
        // If no goals document exists, create one with defaults
        await setDoc(goalsDoc, {
          ...DEFAULT_GOALS,
          updatedAt: serverTimestamp()
        });
        return DEFAULT_GOALS;
      }
    } catch (error) {
      console.error('Error getting goals from Firestore:', error);
      return DEFAULT_GOALS;
    }
  }
  
  async updateGoals(goals: Partial<UserGoals>): Promise<UserGoals> {
    if (!this.db) throw new Error('Firestore not initialized');
    
    const userId = this.getCurrentUser()?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    try {
      // Get current goals first
      const currentGoals = await this.getGoals();
      
      // Merge with updates
      const updatedGoals = { ...currentGoals, ...goals };
      
      // Save to Firestore
      const goalsDoc = doc(this.db, 'users', userId, 'settings', 'goals');
      await updateDoc(goalsDoc, {
        ...updatedGoals,
        updatedAt: serverTimestamp()
      });
      
      return updatedGoals;
    } catch (error) {
      console.error('Error updating goals in Firestore:', error);
      throw error;
    }
  }
  
  // Preferences management
  async getPreferences(): Promise<UserPreferences> {
    if (!this.db) throw new Error('Firestore not initialized');
    
    const userId = this.getCurrentUser()?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    try {
      const prefsDoc = doc(this.db, 'users', userId, 'settings', 'preferences');
      const docSnap = await getDoc(prefsDoc);
      
      if (docSnap.exists()) {
        // Use the data without the timestamp
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { updatedAt, ...preferences } = docSnap.data();
        return preferences as UserPreferences;
      } else {
        // If no preferences document exists, create one with defaults
        await setDoc(prefsDoc, {
          ...DEFAULT_PREFERENCES,
          updatedAt: serverTimestamp()
        });
        return DEFAULT_PREFERENCES;
      }
    } catch (error) {
      console.error('Error getting preferences from Firestore:', error);
      return DEFAULT_PREFERENCES;
    }
  }
  
  async updatePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    if (!this.db) throw new Error('Firestore not initialized');
    
    const userId = this.getCurrentUser()?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    try {
      // Get current preferences first
      const currentPrefs = await this.getPreferences();
      
      // Deep merge for nested objects like colors
      const updatedPrefs = {
        ...currentPrefs,
        ...preferences,
        colors: preferences.colors 
          ? { ...currentPrefs.colors, ...preferences.colors }
          : currentPrefs.colors
      };
      
      // Save to Firestore
      const prefsDoc = doc(this.db, 'users', userId, 'settings', 'preferences');
      await updateDoc(prefsDoc, {
        ...updatedPrefs,
        updatedAt: serverTimestamp()
      });
      
      return updatedPrefs;
    } catch (error) {
      console.error('Error updating preferences in Firestore:', error);
      throw error;
    }
  }
  
  // Daily entries
  async getDailyEntry(date: Date): Promise<DailyEntry | null> {
    if (!this.db) throw new Error('Firestore not initialized');
    
    const userId = this.getCurrentUser()?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    try {
      const dateKey = getEntryKey(date);
      const entryDoc = doc(this.db, 'users', userId, 'dailyEntries', dateKey);
      const docSnap = await getDoc(entryDoc);
      
      if (docSnap.exists()) {
        // Extract relevant fields, excluding metadata
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { updatedAt, ...entryData } = docSnap.data();
        return entryData as DailyEntry;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting daily entry from Firestore:', error);
      return null;
    }
  }
  
  async getDailyEntries(startDate: Date, endDate: Date): Promise<DailyEntry[]> {
    if (!this.db) throw new Error('Firestore not initialized');
    
    const userId = this.getCurrentUser()?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    try {
      const startKey = getEntryKey(startDate);
      const endKey = getEntryKey(endDate);
      
      // Query entries within date range
      const entriesQuery = query(
        collection(this.db, 'users', userId, 'dailyEntries'),
        where('date', '>=', startKey),
        where('date', '<=', endKey),
        orderBy('date', 'asc')
      );
      
      const querySnapshot = await getDocs(entriesQuery);
      
      // Transform to DailyEntry objects
      const entries: DailyEntry[] = [];
      querySnapshot.forEach(doc => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { updatedAt, ...entryData } = doc.data();
        entries.push(entryData as DailyEntry);
      });
      
      return entries;
    } catch (error) {
      console.error('Error getting daily entries from Firestore:', error);
      return [];
    }
  }
  
  async addIncomeToDay(date: Date, amount: number, source: IncomeSource): Promise<DailyEntry> {
    if (!this.db) throw new Error('Firestore not initialized');
    
    const userId = this.getCurrentUser()?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    try {
      const dateKey = getEntryKey(date);
      const entryDoc = doc(this.db, 'users', userId, 'dailyEntries', dateKey);
      
      // Check if entry already exists
      const docSnap = await getDoc(entryDoc);
      let updatedEntry: DailyEntry;
      
      if (docSnap.exists()) {
        // Update existing entry
        const existingData = docSnap.data() as DailyEntry;
        updatedEntry = {
          ...existingData,
          progress: (existingData.progress || 0) + amount,
          segments: [...(existingData.segments || []), { ...source, value: amount }]
        };
        
        await updateDoc(entryDoc, {
          ...updatedEntry,
          updatedAt: serverTimestamp()
        });
      } else {
        // Create new entry
        updatedEntry = {
          date: dateKey,
          progress: amount,
          segments: [{ ...source, value: amount }]
        };
        
        await setDoc(entryDoc, {
          ...updatedEntry,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      // Also update the monthly entry
      await this.updateMonthlyEntryFromDaily(date);
      
      return updatedEntry;
    } catch (error) {
      console.error('Error adding income to day in Firestore:', error);
      throw error;
    }
  }

  // Update specific fields of a daily entry
  async updateDayEntry(date: Date, updates: Partial<DailyEntry>): Promise<DailyEntry> {
    if (!this.db) throw new Error('Firestore not initialized');
    
    const userId = this.getCurrentUser()?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    const dateKey = getEntryKey(date);
    
    try {
      // Reference to the daily entry document
      const entryRef = doc(this.db, 'users', userId, 'dailyEntries', dateKey);
      
      // Get the existing entry
      const entryDoc = await getDoc(entryRef);
      
      // If no entry exists, throw an error
      if (!entryDoc.exists()) {
        throw new Error(`No entry exists for date ${dateKey}`);
      }
      
      // Get the existing data
      const existingData = entryDoc.data() as DailyEntry;
      
      // Merge the updates with the existing data
      const updatedData = {
        ...existingData,
        ...updates,
        // Ensure these fields are preserved
        date: dateKey,
        updatedAt: serverTimestamp()
      };
      
      // Update the document with the merged data
      await updateDoc(entryRef, updatedData);
      
      // Also update the monthly entry if needed
      // Only update monthly if the progress has changed
      if (updates.progress !== undefined || updates.segments !== undefined) {
        await this.updateMonthlyEntryFromDaily(date);
      }
      
      // Return the updated data without the timestamp
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { updatedAt, ...result } = updatedData;
      return result;
    } catch (error) {
      console.error(`Error updating daily entry for ${dateKey}:`, error);
      throw error;
    }
  }
  
  async deleteDayEntry(date: Date): Promise<void> {
    if (!this.db) throw new Error('Firestore not initialized');
    
    const userId = this.getCurrentUser()?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    try {
      const dateKey = getEntryKey(date);
      const entryDoc = doc(this.db, 'users', userId, 'dailyEntries', dateKey);
      await deleteDoc(entryDoc);
      
      // Update the monthly entry
      await this.updateMonthlyEntryFromDaily(date);
    } catch (error) {
      console.error('Error deleting day entry from Firestore:', error);
      throw error;
    }
  }
  
  // Monthly entries
  private async updateMonthlyEntryFromDaily(date: Date): Promise<MonthlyEntry> {
    if (!this.db) throw new Error('Firestore not initialized');
    
    const userId = this.getCurrentUser()?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    try {
      const year = date.getFullYear();
      const month = date.getMonth();
      
      // Get all daily entries for this month
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0); // Last day of month
      
      const dailyEntries = await this.getDailyEntries(startDate, endDate);
      
      // Calculate monthly totals
      let monthlyProgress = 0;
      const segments: { [id: string]: IncomeSource } = {};
      
      dailyEntries.forEach(entry => {
        monthlyProgress += entry.progress || 0;
        
        // Aggregate segments
        (entry.segments || []).forEach(segment => {
          if (segments[segment.id]) {
            segments[segment.id].value += segment.value;
          } else {
            segments[segment.id] = { ...segment };
          }
        });
      });
      
      // Create monthly entry
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
      const monthlyEntry: MonthlyEntry = {
        year,
        month,
        monthKey,  // Include the monthKey property
        progress: monthlyProgress,
        segments: Object.values(segments)
      };
      
      // Save to Firestore
      const entryDoc = doc(this.db, 'users', userId, 'monthlyEntries', monthKey);
      await setDoc(entryDoc, {
        ...monthlyEntry,
        updatedAt: serverTimestamp()
      });

      return monthlyEntry;
    } catch (error) {
      console.error('Error updating monthly entry from daily in Firestore:', error);
      throw error;
    }
  }

  async getMonthlyEntry(year: number, month: number): Promise<MonthlyEntry | null> {
    if (!this.db) throw new Error('Firestore not initialized');

    const userId = this.getCurrentUser()?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
      const entryDoc = doc(this.db, 'users', userId, 'monthlyEntries', monthKey);
      const docSnap = await getDoc(entryDoc);

      if (docSnap.exists()) {
        // Extract relevant fields, excluding metadata
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { updatedAt, ...entryData } = docSnap.data();
        return entryData as MonthlyEntry;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting monthly entry from Firestore:', error);
      return null;
    }
  }

  async getMonthlyEntries(
    startYear: number,
    startMonth: number,
    endYear: number,
    endMonth: number
  ): Promise<MonthlyEntry[]> {
    if (!this.db) throw new Error('Firestore not initialized');

    const userId = this.getCurrentUser()?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      const startKey = `${startYear}-${startMonth.toString().padStart(2, '0')}`;
      const endKey = `${endYear}-${endMonth.toString().padStart(2, '0')}`;

      // Query entries within date range
      const entriesQuery = query(
        collection(this.db, 'users', userId, 'monthlyEntries'),
        where('monthKey', '>=', startKey),
        where('monthKey', '<=', endKey),
        orderBy('monthKey', 'asc')
      );

      const querySnapshot = await getDocs(entriesQuery);

      // Transform to MonthlyEntry objects
      const entries: MonthlyEntry[] = [];
      querySnapshot.forEach(doc => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { updatedAt, ...entryData } = doc.data();
        entries.push(entryData as MonthlyEntry);
      });

      return entries;
    } catch (error) {
      console.error('Error getting monthly entries from Firestore:', error);
      return [];
    }
  }

  // Income sources
  async getIncomeSources(): Promise<IncomeSource[]> {
    if (!this.db) throw new Error('Firestore not initialized');

    const userId = this.getCurrentUser()?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      const sourcesQuery = query(
        collection(this.db, 'users', userId, 'incomeSources'),
        orderBy('name', 'asc')
      );

      const querySnapshot = await getDocs(sourcesQuery);

      // Transform to IncomeSource objects
      const sources: IncomeSource[] = [];
      querySnapshot.forEach(doc => {
        sources.push(doc.data() as IncomeSource);
      });

      return sources;
    } catch (error) {
      console.error('Error getting income sources from Firestore:', error);
      return [];
    }
  }

  async addIncomeSource(source: IncomeSource): Promise<IncomeSource[]> {
    if (!this.db) throw new Error('Firestore not initialized');

    const userId = this.getCurrentUser()?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      // Add the source
      const sourceDoc = doc(this.db, 'users', userId, 'incomeSources', source.id);
      await setDoc(sourceDoc, {
        ...source,
        updatedAt: serverTimestamp()
      });

      // Get the updated list
      return this.getIncomeSources();
    } catch (error) {
      console.error('Error adding income source to Firestore:', error);
      throw error;
    }
  }

  async updateIncomeSource(id: string, updates: Partial<Omit<IncomeSource, 'id'>>): Promise<IncomeSource[]> {
    if (!this.db) throw new Error('Firestore not initialized');

    const userId = this.getCurrentUser()?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      // Get the source first to make sure it exists
      const sourceDoc = doc(this.db, 'users', userId, 'incomeSources', id);
      const docSnap = await getDoc(sourceDoc);

      if (!docSnap.exists()) {
        throw new Error(`Income source with id ${id} not found`);
      }

      // Update the source
      await updateDoc(sourceDoc, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      // Get the updated list
      return this.getIncomeSources();
    } catch (error) {
      console.error('Error updating income source in Firestore:', error);
      throw error;
    }
  }

  // Data management
  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Firestore not initialized');

    const userId = this.getCurrentUser()?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      // Delete all daily entries
      const dailyEntriesQuery = query(
        collection(this.db, 'users', userId, 'dailyEntries')
      );

      const dailySnapshot = await getDocs(dailyEntriesQuery);
      for (const doc of dailySnapshot.docs) {
        await deleteDoc(doc.ref);
      }

      // Delete all monthly entries
      const monthlyEntriesQuery = query(
        collection(this.db, 'users', userId, 'monthlyEntries')
      );

      const monthlySnapshot = await getDocs(monthlyEntriesQuery);
      for (const doc of monthlySnapshot.docs) {
        await deleteDoc(doc.ref);
      }

      // Delete all income sources
      const sourcesQuery = query(
        collection(this.db, 'users', userId, 'incomeSources')
      );

      const sourcesSnapshot = await getDocs(sourcesQuery);
      for (const doc of sourcesSnapshot.docs) {
        await deleteDoc(doc.ref);
      }

      // Reset goals to defaults
      const goalsDoc = doc(this.db, 'users', userId, 'settings', 'goals');
      await setDoc(goalsDoc, {
        ...DEFAULT_GOALS,
        updatedAt: serverTimestamp()
      });

      // Reset preferences to defaults
      const prefsDoc = doc(this.db, 'users', userId, 'settings', 'preferences');
      await setDoc(prefsDoc, {
        ...DEFAULT_PREFERENCES,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error clearing data from Firestore:', error);
      throw error;
    }
  }

  async exportData(): Promise<string> {
    if (!this.db) throw new Error('Firestore not initialized');

    const userId = this.getCurrentUser()?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      const dataToExport: Record<string, unknown> = {
        goals: await this.getGoals(),
        preferences: await this.getPreferences(),
        incomeSources: await this.getIncomeSources()
      };

      // Get all daily entries (for past 2 years)
      const today = new Date();
      const twoYearsAgo = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate());

      const dailyEntries = await this.getDailyEntries(twoYearsAgo, today);
      dataToExport.dailyEntries = {};

      dailyEntries.forEach(entry => {
        (dataToExport.dailyEntries as Record<string, DailyEntry>)[entry.date] = entry;
      });

      // Get all monthly entries (for past 2 years)
      const startYear = twoYearsAgo.getFullYear();
      const startMonth = twoYearsAgo.getMonth();
      const endYear = today.getFullYear();
      const endMonth = today.getMonth();

      const monthlyEntries = await this.getMonthlyEntries(
        startYear, startMonth, endYear, endMonth
      );

      dataToExport.monthlyEntries = {};
      monthlyEntries.forEach(entry => {
        (dataToExport.monthlyEntries as Record<string, MonthlyEntry>)[entry.monthKey] = entry;
      });

      // Convert to JSON
      return JSON.stringify({
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        data: dataToExport
      });
    } catch (error) {
      console.error('Error exporting data from Firestore:', error);
      throw error;
    }
  }

  async importData(jsonData: string): Promise<boolean> {
    if (!this.db) throw new Error('Firestore not initialized');

    const userId = this.getCurrentUser()?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      // Parse the imported data
      const imported = JSON.parse(jsonData);

      if (!imported || !imported.data) {
        throw new Error('Invalid import data format');
      }

      // First clear existing data
      await this.clearAllData();

      const importedData = imported.data;

      // Import goals
      if (importedData.goals) {
        await this.updateGoals(importedData.goals);
      }

      // Import preferences
      if (importedData.preferences) {
        await this.updatePreferences(importedData.preferences);
      }

      // Import income sources
      if (importedData.incomeSources && Array.isArray(importedData.incomeSources)) {
        for (const source of importedData.incomeSources) {
          await this.addIncomeSource(source);
        }
      }

      // Import daily entries
      if (importedData.dailyEntries) {
        for (const [dateKey, entry] of Object.entries(importedData.dailyEntries)) {
          const entryDoc = doc(this.db, 'users', userId, 'dailyEntries', dateKey);
          await setDoc(entryDoc, {
            ...(entry as DailyEntry),
            updatedAt: serverTimestamp()
          });
        }
      }

      // Import monthly entries
      if (importedData.monthlyEntries) {
        for (const [monthKey, entry] of Object.entries(importedData.monthlyEntries)) {
          const entryDoc = doc(this.db, 'users', userId, 'monthlyEntries', monthKey);
          await setDoc(entryDoc, {
            ...(entry as MonthlyEntry),
            updatedAt: serverTimestamp()
          });
        }
      }

      return true;
    } catch (error) {
      console.error('Error importing data to Firestore:', error);
      return false;
    }
  }
}

// Create a singleton instance
export const firebaseService = new FirebaseService();