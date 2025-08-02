// src/apps/openmind/hooks/useOpenMindEntries.ts

import { useState, useEffect } from 'react';
import { OpenMindEntry, ViewMode } from '../types/openmind.types';

export function useOpenMindEntries(currentDate: Date, viewMode: ViewMode) {
  const [entries, setEntries] = useState<OpenMindEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = async () => {
    if (viewMode !== 'day') {
      setEntries([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const dateString = currentDate.toISOString().split('T')[0];
      const response = await fetch(`/api/openmind/entries/${dateString}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch entries');
      }

      const data = await response.json();
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshEntries = () => {
    fetchEntries();
  };

  useEffect(() => {
    fetchEntries();
  }, [currentDate, viewMode]);

  return {
    entries,
    loading,
    error,
    refreshEntries,
  };
}