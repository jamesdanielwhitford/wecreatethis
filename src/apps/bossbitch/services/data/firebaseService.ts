// src/apps/bossbitch/services/data/firebaseService.ts
import { UserData, DEFAULT_USER_DATA, getEntryKey, getMonthKey, DailyEntry, MonthlyEntry } from './types';
import { IncomeSource } from '../../types/goal.types';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  Firestore
} from 'firebase/firestore';

import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  Auth
} from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY_BOSSBITCH,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN_BOSSBITCH,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID_BOSSBITCH,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET_BOSSBITCH,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID_BOSSBITCH,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID_BOSSBITCH
};

// Initialize Firebase with a specific app name to avoid conflicts
let bossbitchApp: FirebaseApp;



// Check if we already have a 'bossbitch' app instance
const existingApp = getApps().find(app => app.name === 'bossbitch');

if (existingApp) {
  console.log("Using existing bossbitch Firebase app");
  bossbitchApp = existingApp;
} else {
  console.log("Initializing new bossbitch Firebase app");
  bossbitchApp = initializeApp(firebaseConfig, 'bossbitch');
}

const db: Firestore = getFirestore(bossbitchApp);
const auth: Auth = getAuth(bossbitchApp);

export class FirebaseService {
  private localCache: UserData = { ...DEFAULT_USER_DATA };
  private currentUser: User | null = null;
  private authListeners: ((user: User | null) => void)[] = [];

  constructor() {
    console.log("Initializing BossBitch Firebase Service");
    // Set up auth state change listener
    onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed:", user ? "User authenticated" : "No user");
      this.currentUser = user;
      this.authListeners.forEach(listener => listener(user));
      
      if (user) {
        this.loadUserData();
      } else {
        this.localCache = { ...DEFAULT_USER_DATA };
      }
    });
  }

  // Authentication methods
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    this.authListeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.authListeners = this.authListeners.filter(listener => listener !== callback);
    };
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  async signIn(email: string, password: string): Promise<User> {
    console.log("Attempting to sign in:", email);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log("Sign in successful:", result.user.uid);
      return result.user;
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    }
  }

  async signUp(email: string, password: string): Promise<User> {
    console.log("Attempting to sign up:", email);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      console.log("User created successfully:", result.user.uid);
      await this.initializeUserData(result.user.uid);
      return result.user;
    } catch (error) {
      console.error("Sign up error:", error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    console.log("Signing out user");
    await firebaseSignOut(auth);
  }

  // Data management methods
  private async loadUserData(): Promise<void> {
    if (!this.currentUser) {
      console.log("Cannot load user data: No authenticated user");
      return;
    }

    try {
      console.log("Loading user data for:", this.currentUser.uid);
      const userDocRef = doc(db, 'users', this.currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        console.log("User document found, loading data");
        const userData = userDocSnap.data() as UserData;
        this.localCache = userData;
      } else {
        console.log("User document not found, initializing new data");
        await this.initializeUserData(this.currentUser.uid);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  private async initializeUserData(userId: string): Promise<void> {
    try {
      console.log("Initializing user data for:", userId);
      const userDocRef = doc(db, 'users', userId);
      const docSnapshot = await getDoc(userDocRef);
      
      if (!docSnapshot.exists()) {
        console.log("Creating new user document with ID:", userId);
        await setDoc(userDocRef, DEFAULT_USER_DATA);
        console.log("User document created successfully");
        this.localCache = { ...DEFAULT_USER_DATA };
      } else {
        console.log("User document already exists");
        this.localCache = docSnapshot.data() as UserData;
      }
    } catch (error) {
      console.error('Error initializing user data:', error);
      throw error;
    }
  }

  private async saveUserData(): Promise<void> {
    if (!this.currentUser) {
      console.log("Cannot save user data: No authenticated user");
      return;
    }

    try {
      console.log("Saving user data for:", this.currentUser.uid);
      const userDocRef = doc(db, 'users', this.currentUser.uid);
      await setDoc(userDocRef, this.localCache);
      console.log("User data saved successfully");
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  }

  // Goals management
  async getGoals() {
    await this.ensureDataLoaded();
    return { ...this.localCache.goals };
  }

  async updateGoals(goals: Partial<UserData['goals']>) {
    if (!this.currentUser) throw new Error('User not authenticated');
    
    console.log("Updating goals for user:", this.currentUser.uid);
    this.localCache.goals = {
      ...this.localCache.goals,
      ...goals,
    };
    
    try {
      const userDocRef = doc(db, 'users', this.currentUser.uid);
      const docSnap = await getDoc(userDocRef);
      
      if (!docSnap.exists()) {
        console.log("Document doesn't exist, creating first");
        await this.initializeUserData(this.currentUser.uid);
      }
      
      await updateDoc(userDocRef, { goals: this.localCache.goals });
      console.log("Goals updated successfully");
      
      return this.localCache.goals;
    } catch (error) {
      console.error("Error updating goals:", error);
      throw error;
    }
  }

  // Preferences management
  async getPreferences() {
    await this.ensureDataLoaded();
    return { ...this.localCache.preferences };
  }

  async updatePreferences(preferences: Partial<UserData['preferences']>) {
    if (!this.currentUser) throw new Error('User not authenticated');
    
    console.log("Updating preferences for user:", this.currentUser.uid);
    this.localCache.preferences = {
      ...this.localCache.preferences,
      ...preferences,
    };
    
    try {
      const userDocRef = doc(db, 'users', this.currentUser.uid);
      const docSnap = await getDoc(userDocRef);
      
      if (!docSnap.exists()) {
        console.log("Document doesn't exist, creating first");
        await this.initializeUserData(this.currentUser.uid);
      }
      
      await updateDoc(userDocRef, { preferences: this.localCache.preferences });
      console.log("Preferences updated successfully");
      
      return this.localCache.preferences;
    } catch (error) {
      console.error("Error updating preferences:", error);
      throw error;
    }
  }

  // Daily entries
  async getDailyEntry(date: Date): Promise<DailyEntry | null> {
    await this.ensureDataLoaded();
    const key = getEntryKey(date);
    return this.localCache.dailyEntries[key] || null;
  }

  async getDailyEntries(startDate: Date, endDate: Date): Promise<DailyEntry[]> {
    await this.ensureDataLoaded();
    
    const entries: DailyEntry[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const key = getEntryKey(currentDate);
      const entry = this.localCache.dailyEntries[key];
      
      if (entry) {
        entries.push(entry);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return entries;
  }

  async addIncomeToDay(date: Date, amount: number, source: IncomeSource): Promise<DailyEntry> {
    if (!this.currentUser) throw new Error('User not authenticated');
    
    await this.ensureDataLoaded();
    
    console.log("Adding income for date:", getEntryKey(date));
    const key = getEntryKey(date);
    const existingEntry = this.localCache.dailyEntries[key] || {
      date: key,
      progress: 0,
      segments: [],
    };
  
    // Check if this source already exists in the day's segments
    const existingSegmentIndex = existingEntry.segments.findIndex(seg => seg.id === source.id);
    
    let updatedSegments: IncomeSource[];
    if (existingSegmentIndex >= 0) {
      updatedSegments = existingEntry.segments.map((segment, index) => 
        index === existingSegmentIndex
          ? { ...segment, value: segment.value + amount }
          : segment
      );
    } else {
      updatedSegments = [
        ...existingEntry.segments,
        { ...source, value: amount }
      ];
    }
  
    const updatedEntry: DailyEntry = {
      ...existingEntry,
      progress: existingEntry.progress + amount,
      segments: updatedSegments,
    };
  
    this.localCache.dailyEntries[key] = updatedEntry;
    
    try {
      console.log("Saving daily entry to Firestore");
      const userDocRef = doc(db, 'users', this.currentUser.uid);
      const docSnapshot = await getDoc(userDocRef);
      
      if (!docSnapshot.exists()) {
        console.log("User document doesn't exist, creating it first");
        await this.initializeUserData(this.currentUser.uid);
        
        const updatedUserData = {
          ...this.localCache,
          dailyEntries: {
            [key]: updatedEntry
          }
        };
        
        await setDoc(userDocRef, updatedUserData);
      } else {
        await updateDoc(userDocRef, { [`dailyEntries.${key}`]: updatedEntry });
      }
      
      console.log("Daily entry saved successfully");
    } catch (error) {
      console.error('Error updating daily entry:', error);
      throw error;
    }
  
    await this.addIncomeToMonth(date, amount, source);
  
    if (existingSegmentIndex < 0) {
      await this.addIncomeSource(source);
    }
  
    return updatedEntry;
  }

  async deleteDayEntry(date: Date): Promise<void> {
    if (!this.currentUser) throw new Error('User not authenticated');
    
    const key = getEntryKey(date);
    const monthKey = getMonthKey(date.getFullYear(), date.getMonth());
    
    try {
      await this.ensureDataLoaded();
      
      // Get the entry we're about to delete
      const entryToDelete = this.localCache.dailyEntries[key];
      
      if (entryToDelete) {
        // Get the monthly entry that needs updating
        const monthlyEntry = this.localCache.monthlyEntries[monthKey];
        
        if (monthlyEntry) {
          // Update monthly entry by subtracting the deleted day's values
          const updatedMonthlyEntry: MonthlyEntry = {
            ...monthlyEntry,
            progress: monthlyEntry.progress - entryToDelete.progress,
            segments: monthlyEntry.segments.map(segment => {
              const matchingDaySegment = entryToDelete.segments.find(s => s.id === segment.id);
              return {
                ...segment,
                value: segment.value - (matchingDaySegment?.value || 0)
              };
            }).filter(segment => segment.value > 0) // Remove segments with 0 value
          };
          
          // Update local cache
          this.localCache.monthlyEntries[monthKey] = updatedMonthlyEntry;
          delete this.localCache.dailyEntries[key];
          
          // Update both daily and monthly entries in Firestore atomically
          const userDocRef = doc(db, 'users', this.currentUser.uid);
          await updateDoc(userDocRef, {
            [`dailyEntries.${key}`]: null,
            [`monthlyEntries.${monthKey}`]: updatedMonthlyEntry
          });
          
          console.log("Daily entry and monthly totals updated successfully");
        }
      } else {
        // If no entry found, just ensure it's removed from storage
        const userDocRef = doc(db, 'users', this.currentUser.uid);
        await updateDoc(userDocRef, { [`dailyEntries.${key}`]: null });
        console.log("Daily entry deleted (no monthly update needed)");
      }
    } catch (error) {
      console.error("Error deleting day entry:", error);
      throw error;
    }
  }

  // Monthly entries
  async getMonthlyEntry(year: number, month: number): Promise<MonthlyEntry | null> {
    await this.ensureDataLoaded();
    const key = getMonthKey(year, month);
    return this.localCache.monthlyEntries[key] || null;
  }

  async getMonthlyEntries(
    startYear: number, 
    startMonth: number,
    endYear: number, 
    endMonth: number
  ): Promise<MonthlyEntry[]> {
    await this.ensureDataLoaded();
    
    const entries: MonthlyEntry[] = [];
    
    for (let year = startYear; year <= endYear; year++) {
      const monthStart = year === startYear ? startMonth : 0;
      const monthEnd = year === endYear ? endMonth : 11;
      
      for (let month = monthStart; month <= monthEnd; month++) {
        const key = getMonthKey(year, month);
        const entry = this.localCache.monthlyEntries[key];
        
        if (entry) {
          entries.push(entry);
        }
      }
    }
    
    return entries;
  }

  private async addIncomeToMonth(date: Date, amount: number, source: IncomeSource): Promise<MonthlyEntry> {
    if (!this.currentUser) throw new Error('User not authenticated');
    
    const year = date.getFullYear();
    const month = date.getMonth();
    const key = getMonthKey(year, month);
    
    console.log("Adding income to month:", key);
    const existingEntry = this.localCache.monthlyEntries[key] || {
      year,
      month,
      progress: 0,
      segments: [],
    };

    // Check if this source already exists in the month's segments
    const existingSegmentIndex = existingEntry.segments.findIndex(seg => seg.id === source.id);
    
    let updatedSegments: IncomeSource[];
    if (existingSegmentIndex >= 0) {
      // Update existing segment
      updatedSegments = existingEntry.segments.map((segment, index) => 
        index === existingSegmentIndex
          ? { ...segment, value: segment.value + amount }
          : segment
      );
    } else {
      // Add new segment
      updatedSegments = [
        ...existingEntry.segments,
        { ...source, value: amount }
      ];
    }

    // Update entry
    const updatedEntry: MonthlyEntry = {
      ...existingEntry,
      progress: existingEntry.progress + amount,
      segments: updatedSegments,
    };

    // Update local cache
    this.localCache.monthlyEntries[key] = updatedEntry;
    
    try {
      // Make sure the document exists
      const userDocRef = doc(db, 'users', this.currentUser.uid);
      const docSnapshot = await getDoc(userDocRef);
      
      if (!docSnapshot.exists()) {
        console.log("User document doesn't exist, creating it first");
        await this.initializeUserData(this.currentUser.uid);
        
        // After creating the document, use setDoc to update with the monthly entry
        const updatedUserData = {
          ...this.localCache,
          monthlyEntries: {
            [key]: updatedEntry
          }
        };
        
        await setDoc(userDocRef, updatedUserData);
      } else {
        // Document exists, update using updateDoc
        await updateDoc(userDocRef, { [`monthlyEntries.${key}`]: updatedEntry });
      }
      
      console.log("Monthly entry saved successfully");
    } catch (error) {
      console.error('Error updating monthly entry:', error);
      throw error;
    }

    return updatedEntry;
  }

  // Income sources management
  async getIncomeSources(): Promise<IncomeSource[]> {
    await this.ensureDataLoaded();
    return [...this.localCache.incomeSources];
  }

  async addIncomeSource(source: IncomeSource): Promise<IncomeSource[]> {
    if (!this.currentUser) throw new Error('User not authenticated');
    
    console.log("Adding income source:", source.name);
    // Check if source already exists
    const existingSourceIndex = this.localCache.incomeSources.findIndex(s => s.id === source.id);
    
    if (existingSourceIndex < 0) {
      const newSource = {
        id: source.id,
        name: source.name,
        color: source.color,
        value: 0, // Reset value since this is just the source template
      };
      
      this.localCache.incomeSources.push(newSource);
      
      try {
        // Make sure the document exists
        const userDocRef = doc(db, 'users', this.currentUser.uid);
        const docSnapshot = await getDoc(userDocRef);
        
        if (!docSnapshot.exists()) {
          console.log("User document doesn't exist, creating it first");
          await this.initializeUserData(this.currentUser.uid);
        }
        
        // Save to Firestore
        await updateDoc(userDocRef, { incomeSources: this.localCache.incomeSources });
        console.log("Income source added successfully");
      } catch (error) {
        console.error('Error adding income source:', error);
        throw error;
      }
    }
    
    return this.localCache.incomeSources;
  }

  async updateIncomeSource(id: string, updates: Partial<Omit<IncomeSource, 'id'>>): Promise<IncomeSource[]> {
    if (!this.currentUser) throw new Error('User not authenticated');
    
    console.log("Updating income source:", id);
    this.localCache.incomeSources = this.localCache.incomeSources.map(source => 
      source.id === id
        ? { ...source, ...updates }
        : source
    );
    
    try {
      // Make sure the document exists
      const userDocRef = doc(db, 'users', this.currentUser.uid);
      const docSnapshot = await getDoc(userDocRef);
      
      if (!docSnapshot.exists()) {
        console.log("User document doesn't exist, creating it first");
        await this.initializeUserData(this.currentUser.uid);
      }
      
      // Save to Firestore
      await updateDoc(userDocRef, { incomeSources: this.localCache.incomeSources });
      console.log("Income source updated successfully");
    } catch (error) {
      console.error('Error updating income source:', error);
      throw error;
    }
    
    return this.localCache.incomeSources;
  }

  // Data management
  async clearAllData(): Promise<void> {
    if (!this.currentUser) throw new Error('User not authenticated');
    
    console.log("Clearing all data for user:", this.currentUser.uid);
    this.localCache = { ...DEFAULT_USER_DATA };
    
    try {
      // Save to Firestore
      const userDocRef = doc(db, 'users', this.currentUser.uid);
      await setDoc(userDocRef, this.localCache);
      console.log("All data cleared successfully");
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  }

  async exportData(): Promise<string> {
    await this.ensureDataLoaded();
    console.log("Exporting user data");
    return JSON.stringify(this.localCache);
  }

  async importData(jsonData: string): Promise<boolean> {
    if (!this.currentUser) throw new Error('User not authenticated');
    
    console.log("Importing user data");
    try {
      const data = JSON.parse(jsonData) as UserData;
      this.localCache = data;
      
      // Save to Firestore
      const userDocRef = doc(db, 'users', this.currentUser.uid);
      await setDoc(userDocRef, this.localCache);
      console.log("Data imported successfully");
      
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }

  // Helper methods
  private async ensureDataLoaded(): Promise<void> {
    if (!this.currentUser) throw new Error('User not authenticated');
    
    // If we haven't loaded data yet, load it
    if (JSON.stringify(this.localCache) === JSON.stringify(DEFAULT_USER_DATA)) {
      console.log("Data not loaded yet, loading from Firestore");
      await this.loadUserData();
    }
  }
}

// Create a singleton instance
export const firebaseService = new FirebaseService();