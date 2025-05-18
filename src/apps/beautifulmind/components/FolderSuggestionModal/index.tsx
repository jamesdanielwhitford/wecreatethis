/**
 * File: src/apps/beautifulmind/components/FolderSuggestionModal/index.tsx
 * Modal for suggesting folders based on note clustering
 */

'use client';

import React, { useState, useEffect } from 'react';
import styles from './styles.module.css';
import { FolderSuggestion } from '../../types';
import { getFolderSuggestions, createFolder, moveNotesToFolder } from '../../utils';

interface FolderSuggestionModalProps {
  userId: string;
  onClose: () => void;
  onSuccess: (folderId: string, folderName: string, noteIds: string[]) => void;
}

const FolderSuggestionModal: React.FC<FolderSuggestionModalProps> = ({
  userId,
  onClose,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<FolderSuggestion[]>([]);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(-1);
  
  // Load folder suggestions on component mount
  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const folderSuggestions = await getFolderSuggestions(userId);
        
        if (folderSuggestions.length === 0) {
          setError('Not enough notes with similar content to suggest folders. Try adding more notes first.');
        } else {
          setSuggestions(folderSuggestions);
        }
      } catch (err) {
        console.error('Error loading folder suggestions:', err);
        setError('Failed to load folder suggestions. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSuggestions();
  }, [userId]);
  
  // Accept a folder suggestion
  const handleAcceptSuggestion = async (suggestion: FolderSuggestion, index: number) => {
    if (!suggestion.folderName) return;
    
    setIsCreating(true);
    setActiveSuggestionIndex(index);
    
    try {
      // Create a new folder
      const folder = await createFolder({
        name: suggestion.folderName,
        parentId: suggestion.parentFolderId || null,
        path: suggestion.parentFolderId ? [suggestion.parentFolderId] : [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userId
      });
      
      // Move notes to the new folder
      await moveNotesToFolder(suggestion.noteIds, folder.id, userId);
      
      // Notify parent component
      onSuccess(folder.id, folder.name, suggestion.noteIds);
    } catch (err) {
      console.error('Error creating folder from suggestion:', err);
      setError('Failed to create folder. Please try again.');
    } finally {
      setIsCreating(false);
      setActiveSuggestionIndex(-1);
    }
  };
  
  // Get progress bar width based on confidence
  const getConfidenceWidth = (confidence: number) => {
    // Map confidence (usually 0-1) to percentage width
    return `${Math.min(Math.round(confidence * 100), 100)}%`;
  };
  
  // Get confidence level text
  const getConfidenceLevel = (confidence: number) => {
    if (confidence > 0.9) return 'Very High';
    if (confidence > 0.8) return 'High';
    if (confidence > 0.7) return 'Good';
    if (confidence > 0.6) return 'Moderate';
    return 'Low';
  };
  
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Folder Suggestions</h3>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div className={styles.modalContent}>
          {isLoading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Analyzing your notes and finding patterns...</p>
            </div>
          ) : error ? (
            <div className={styles.error}>
              <p>{error}</p>
            </div>
          ) : suggestions.length === 0 ? (
            <div className={styles.emptySuggestions}>
              <p>No folder suggestions available at this time.</p>
              <p>Try adding more notes with similar content to get suggestions.</p>
            </div>
          ) : (
            <div className={styles.suggestionsList}>
              {suggestions.map((suggestion, index) => (
                <div 
                  key={index} 
                  className={`${styles.suggestionCard} ${activeSuggestionIndex === index ? styles.active : ''}`}
                >
                  <div className={styles.suggestionHeader}>
                    <h4 className={styles.folderName}>{suggestion.folderName}</h4>
                    
                    <div className={styles.confidenceContainer}>
                      <div className={styles.confidenceBar}>
                        <div 
                          className={styles.confidenceLevel} 
                          style={{ width: getConfidenceWidth(suggestion.confidence) }}
                        ></div>
                      </div>
                      <span className={styles.confidenceText}>
                        {getConfidenceLevel(suggestion.confidence)} match
                      </span>
                    </div>
                  </div>
                  
                  <div className={styles.notesCount}>
                    {suggestion.noteIds.length} {suggestion.noteIds.length === 1 ? 'note' : 'notes'}
                  </div>
                  
                  <div className={styles.suggestionActions}>
                    <button 
                      className={styles.createButton}
                      onClick={() => handleAcceptSuggestion(suggestion, index)}
                      disabled={isCreating}
                    >
                      {isCreating && activeSuggestionIndex === index ? (
                        <>Creating...</>
                      ) : (
                        <>Create Folder</>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className={styles.modalFooter}>
          <p className={styles.infoText}>
            Suggestions are based on the semantic similarity of your notes.
          </p>
          <button 
            className={styles.closeModalButton}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default FolderSuggestionModal;