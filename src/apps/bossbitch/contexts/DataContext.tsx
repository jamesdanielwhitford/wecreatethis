// src/apps/bossbitch/contexts/DataContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { dataService } from '../services/data/dataService';
import { UserGoals, UserPreferences } from '../services/data/types';
import { IncomeSource } from '../types/goal.types';
import { User } from 'firebase/auth';

interface DataContextType {
  // Authentication
  isAuthenticated: boolean;
  currentUser: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  
  // Goals
  goals: UserGoals | null;
  updateGoals: (goals: Partial<UserGoals>) => Promise<void>;
  
  // Preferences
  preferences: UserPreferences | null;
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  
  // Income sources
  incomeSources: IncomeSource[];
  addIncomeSource: (source: IncomeSource) => Promise<void>;
  updateIncomeSource: (id: string, updates: Partial<Omit<IncomeSource, 'id'>>) => Promise<void>;
  
  // Daily entries
  addIncomeToDay: (date: Date, amount: number, source: IncomeSource) => Promise<void>;
  
  // Data management
  clearAllData: () => Promise<void>;
  exportData: () => Promise<string>;
  importData: (jsonData: string) => Promise<boolean>;
  migrateLocalToFirebase: () => Promise<boolean>;
  
  // Loading state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Data refresh
  refreshAllData: () => Promise<void>;
  lastUpdateTimestamp: number;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [goals, setGoals] = useState<UserGoals | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState<number>(Date.now());

  // Handle authentication state changes
  useEffect(() => {
    const unsubscribe = dataService.onAuthStateChanged((authenticated) => {
      setIsAuthenticated(authenticated);
      setCurrentUser(dataService.getCurrentUser());
      
      // Reset state when auth status changes
      setGoals(null);
      setPreferences(null);
      setIncomeSources([]);
      
      // Load data for the new auth state
      loadInitialData();
    });
    
    return unsubscribe;
  }, []);

  // Load initial data
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // Load goals
      const userGoals = await dataService.getGoals();
      setGoals(userGoals);
      
      // Load preferences
      const userPreferences = await dataService.getPreferences();
      setPreferences(userPreferences);
      
      // Load income sources
      const sources = await dataService.getIncomeSources();
      setIncomeSources(sources);

      // Update timestamp after successful load
      setLastUpdateTimestamp(Date.now());
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh all data
  const refreshAllData = async () => {
    console.log('Refreshing all data');
    await loadInitialData();
  };

  // Authentication handlers
  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const user = await dataService.signIn(email, password);
      setCurrentUser(user);
      setIsAuthenticated(true);
      await refreshAllData();
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const user = await dataService.signUp(email, password);
      setCurrentUser(user);
      setIsAuthenticated(true);
      await refreshAllData();
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await dataService.signOut();
      setCurrentUser(null);
      setIsAuthenticated(false);
      await refreshAllData();
    } finally {
      setIsLoading(false);
    }
  };

  // Goals handlers
  const updateGoals = async (updatedGoals: Partial<UserGoals>) => {
    setIsLoading(true);
    try {
      const newGoals = await dataService.updateGoals(updatedGoals);
      setGoals(newGoals);
      await refreshAllData();
    } finally {
      setIsLoading(false);
    }
  };

  // Preferences handlers
  const updatePreferences = async (updatedPreferences: Partial<UserPreferences>) => {
    setIsLoading(true);
    try {
      const newPreferences = await dataService.updatePreferences(updatedPreferences);
      setPreferences(newPreferences);
      await refreshAllData();
    } finally {
      setIsLoading(false);
    }
  };

  // Income source handlers
  const addIncomeSource = async (source: IncomeSource) => {
    setIsLoading(true);
    try {
      const newSources = await dataService.addIncomeSource(source);
      setIncomeSources(newSources);
      await refreshAllData();
    } finally {
      setIsLoading(false);
    }
  };

  const updateIncomeSource = async (id: string, updates: Partial<Omit<IncomeSource, 'id'>>) => {
    setIsLoading(true);
    try {
      const newSources = await dataService.updateIncomeSource(id, updates);
      setIncomeSources(newSources);
      await refreshAllData();
    } finally {
      setIsLoading(false);
    }
  };

  // Daily entry handlers
  const addIncomeToDay = async (date: Date, amount: number, source: IncomeSource) => {
    setIsLoading(true);
    try {
      await dataService.addIncomeToDay(date, amount, source);
      await refreshAllData();
    } finally {
      setIsLoading(false);
    }
  };

  // Data management handlers
  const clearAllData = async () => {
    setIsLoading(true);
    try {
      await dataService.clearAllData();
      await refreshAllData();
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = async () => {
    setIsLoading(true);
    try {
      return await dataService.exportData();
    } finally {
      setIsLoading(false);
    }
  };

  const importData = async (jsonData: string) => {
    setIsLoading(true);
    try {
      const success = await dataService.importData(jsonData);
      if (success) {
        await refreshAllData();
      }
      return success;
    } finally {
      setIsLoading(false);
    }
  };

  const migrateLocalToFirebase = async () => {
    setIsLoading(true);
    try {
      const success = await dataService.migrateLocalToFirebase();
      if (success) {
        await refreshAllData();
      }
      return success;
    } finally {
      setIsLoading(false);
    }
  };

  const value: DataContextType = {
    isAuthenticated,
    currentUser,
    signIn,
    signUp,
    signOut,
    goals,
    updateGoals,
    preferences,
    updatePreferences,
    incomeSources,
    addIncomeSource,
    updateIncomeSource,
    addIncomeToDay,
    clearAllData,
    exportData,
    importData,
    migrateLocalToFirebase,
    isLoading,
    setIsLoading,
    refreshAllData,
    lastUpdateTimestamp,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};