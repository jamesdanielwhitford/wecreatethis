// src/apps/bossbitch/services/data/localStorageService.ts
import { UserData, DEFAULT_USER_DATA, getEntryKey, getMonthKey, DailyEntry, MonthlyEntry } from './types';
import { IncomeSource } from '../../types/goal.types';

const STORAGE_KEY = 'bossbitch_data';

export class LocalStorageService {
  private userData: UserData;

  constructor() {
    this.userData = this.loadData();
  }

  // Core data operations
  private loadData(): UserData {
    if (typeof window === 'undefined') {
      return { ...DEFAULT_USER_DATA };
    }

    const storedData = localStorage.getItem(STORAGE_KEY);
    if (!storedData) {
      return { ...DEFAULT_USER_DATA };
    }

    try {
      return JSON.parse(storedData) as UserData;
    } catch (error) {
      console.error('Error parsing stored data:', error);
      return { ...DEFAULT_USER_DATA };
    }
  }

  private saveData(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.userData));
  }

  // Goals management
  getGoals() {
    return { ...this.userData.goals };
  }

  updateGoals(goals: Partial<UserData['goals']>) {
    this.userData.goals = {
      ...this.userData.goals,
      ...goals,
    };
    this.saveData();
    return this.userData.goals;
  }

  // Preferences management
  getPreferences() {
    return { ...this.userData.preferences };
  }

  updatePreferences(preferences: Partial<UserData['preferences']>) {
    this.userData.preferences = {
      ...this.userData.preferences,
      ...preferences,
    };
    this.saveData();
    return this.userData.preferences;
  }

  // Daily entries
  getDailyEntry(date: Date): DailyEntry | null {
    const key = getEntryKey(date);
    return this.userData.dailyEntries[key] || null;
  }

  getDailyEntries(startDate: Date, endDate: Date): DailyEntry[] {
    const entries: DailyEntry[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const key = getEntryKey(currentDate);
      const entry = this.userData.dailyEntries[key];
      
      if (entry) {
        entries.push(entry);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return entries;
  }

  addIncomeToDay(date: Date, amount: number, source: IncomeSource): DailyEntry {
    const key = getEntryKey(date);
    const existingEntry = this.userData.dailyEntries[key] || {
      date: key,
      progress: 0,
      segments: [],
    };

    // Check if this source already exists in the day's segments
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
    const updatedEntry: DailyEntry = {
      ...existingEntry,
      progress: existingEntry.progress + amount,
      segments: updatedSegments,
    };

    // Save to storage
    this.userData.dailyEntries[key] = updatedEntry;
    this.saveData();

    // Also update monthly entry
    this.addIncomeToMonth(date, amount, source);

    // Update income sources if it's a new one
    if (existingSegmentIndex < 0) {
      this.addIncomeSource(source);
    }

    return updatedEntry;
  }

  deleteDayEntry(date: Date): void {
    const key = getEntryKey(date);
    const monthKey = getMonthKey(date.getFullYear(), date.getMonth());
    
    // Get the entry we're about to delete
    const entryToDelete = this.userData.dailyEntries[key];
    
    if (entryToDelete) {
      // Get the monthly entry that needs updating
      const monthlyEntry = this.userData.monthlyEntries[monthKey];
      
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
        
        // Update monthly entry in storage
        this.userData.monthlyEntries[monthKey] = updatedMonthlyEntry;
      }
    }
    
    // Delete the daily entry
    delete this.userData.dailyEntries[key];
    
    // Save all changes
    this.saveData();
  }

  // Monthly entries
  getMonthlyEntry(year: number, month: number): MonthlyEntry | null {
    const key = getMonthKey(year, month);
    return this.userData.monthlyEntries[key] || null;
  }

  getMonthlyEntries(startYear: number, startMonth: number, endYear: number, endMonth: number): MonthlyEntry[] {
    const entries: MonthlyEntry[] = [];
    
    for (let year = startYear; year <= endYear; year++) {
      const monthStart = year === startYear ? startMonth : 0;
      const monthEnd = year === endYear ? endMonth : 11;
      
      for (let month = monthStart; month <= monthEnd; month++) {
        const key = getMonthKey(year, month);
        const entry = this.userData.monthlyEntries[key];
        
        if (entry) {
          entries.push(entry);
        }
      }
    }
    
    return entries;
  }

  private addIncomeToMonth(date: Date, amount: number, source: IncomeSource): MonthlyEntry {
    const year = date.getFullYear();
    const month = date.getMonth();
    const key = getMonthKey(year, month);
    
    const existingEntry = this.userData.monthlyEntries[key] || {
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

    // Save to storage
    this.userData.monthlyEntries[key] = updatedEntry;
    this.saveData();

    return updatedEntry;
  }

  // Income sources management
  getIncomeSources(): IncomeSource[] {
    return [...this.userData.incomeSources];
  }

  addIncomeSource(source: IncomeSource): IncomeSource[] {
    // Check if source already exists
    const existingSourceIndex = this.userData.incomeSources.findIndex(s => s.id === source.id);
    
    if (existingSourceIndex < 0) {
      this.userData.incomeSources.push({
        id: source.id,
        name: source.name,
        color: source.color,
        value: 0, // Reset value since this is just the source template
      });
      this.saveData();
    }
    
    return this.userData.incomeSources;
  }

  updateIncomeSource(id: string, updates: Partial<Omit<IncomeSource, 'id'>>): IncomeSource[] {
    this.userData.incomeSources = this.userData.incomeSources.map(source => 
      source.id === id
        ? { ...source, ...updates }
        : source
    );
    
    this.saveData();
    return this.userData.incomeSources;
  }

  // Data management
  clearAllData(): void {
    this.userData = { ...DEFAULT_USER_DATA };
    this.saveData();
  }

  exportData(): string {
    return JSON.stringify(this.userData);
  }

  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData) as UserData;
      this.userData = data;
      this.saveData();
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }
}

// Create a singleton instance
export const localStorageService = new LocalStorageService();