import { useState, useCallback } from 'react';
import { Bird, BirdSearchFilters } from '../types/bird.types';
import { searchBirds } from '../utils/inaturalist-api';

export function useBirdSearch() {
  const [birds, setBirds] = useState<Bird[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<BirdSearchFilters>({
    southAfricaOnly: false,
    query: ''
  });

  const search = useCallback(async (query: string, southAfricaOnly: boolean = false) => {
    if (!query.trim()) {
      setBirds([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await searchBirds(query, southAfricaOnly);
      setBirds(response.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setBirds([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateFilters = useCallback((newFilters: Partial<BirdSearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  return {
    birds,
    loading,
    error,
    filters,
    search,
    updateFilters
  };
}