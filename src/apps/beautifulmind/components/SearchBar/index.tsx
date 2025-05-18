/**
 * File: src/apps/beautifulmind/components/SearchBar/index.tsx
 * Semantic search bar component for Beautiful Mind
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './styles.module.css';
import { semanticSearch } from '../../utils';
import { Note } from '../../types';

interface SearchBarProps {
  userId: string;
  onSearchResults: (results: Note[], query: string) => void;
  onClearSearch: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  userId, 
  onSearchResults, 
  onClearSearch 
}) => {
  const [query, setQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    if (!newQuery.trim()) {
      onClearSearch();
      return;
    }
    
    // Debounce search to avoid too many requests
    const timeout = setTimeout(() => {
      performSearch(newQuery);
    }, 500);
    
    setSearchTimeout(timeout);
  };
  
  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim() || !userId) return;
    
    setIsSearching(true);
    try {
      const results = await semanticSearch(searchQuery, userId);
      
      // Convert search results to notes
      const notes: Note[] = results.map(result => ({
        id: result.noteId,
        title: result.title || '',
        text: result.text || '',
        createdAt: result.createdAt || Date.now(),
        updatedAt: result.updatedAt || Date.now(),
        userId,
        folderPath: result.folderPath || [],
        embedding: undefined, // Don't need to include the embedding
        score: result.score
      }));
      
      onSearchResults(notes, searchQuery);
    } catch (error) {
      console.error('Error performing search:', error);
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleClearSearch = () => {
    setQuery('');
    onClearSearch();
    
    // Focus back on search input
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };
  
  // Clear search on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);
  
  return (
    <div className={styles.searchBar}>
      <div className={styles.searchInputContainer}>
        <input
          ref={searchInputRef}
          type="text"
          className={styles.searchInput}
          placeholder="Search notes semantically..."
          value={query}
          onChange={handleSearchChange}
        />
        {query && (
          <button 
            className={styles.clearButton}
            onClick={handleClearSearch}
            title="Clear search"
          >
            ×
          </button>
        )}
      </div>
      
      {isSearching && (
        <div className={styles.searchingIndicator}>
          Searching...
        </div>
      )}
    </div>
  );
};

export default SearchBar;