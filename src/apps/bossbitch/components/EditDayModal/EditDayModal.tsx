'use client';

// src/apps/bossbitch/components/EditDayModal/EditDayModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { IncomeSource } from '../../types/goal.types';
import { formatZAR, parseZAR } from '../../utils/currency';
import { useData } from '../../contexts/DataContext';
import styles from './styles.module.css';

interface EditDayModalProps {
  onClose: () => void;
  onSave: () => void;
  selectedDate: Date;
  incomeSources: IncomeSource[];
}

const EditDayModal: React.FC<EditDayModalProps> = ({
  onClose,
  onSave,
  selectedDate,
  incomeSources,
}) => {
  const [editableSources, setEditableSources] = useState<IncomeSource[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  // Get only what we need from the context
  const { addIncomeToDay, isLoading, setIsLoading } = useData();
  
  // Initialize editable sources with the existing ones
  useEffect(() => {
    setEditableSources([...incomeSources]);
  }, [incomeSources]);

  // Handle updating the amount of a source
  const handleUpdateAmount = (id: string, newValue: string) => {
    const parsedValue = parseZAR(newValue);
    
    if (isNaN(parsedValue)) return;
    
    setEditableSources(prevSources => 
      prevSources.map(source => 
        source.id === id 
          ? { ...source, value: parsedValue } 
          : source
      )
    );
  };

  // Handle removing a source
  const handleRemoveSource = (id: string) => {
    setEditableSources(prevSources => 
      prevSources.filter(source => source.id !== id)
    );
  };

  // Save the updated income sources
  const handleSave = async () => {
    setIsEditing(true);
    setIsLoading(true);
    
    try {
      // Direct approach - use local storage APIs to manually handle the update
      if (typeof window !== 'undefined') {
        const STORAGE_KEY = 'bossbitch_data';
        const storedData = localStorage.getItem(STORAGE_KEY);
        
        if (storedData) {
          // Parse the stored data
          const userData = JSON.parse(storedData);
          
          // Format date to YYYY-MM-DD for storage key
          const dateKey = selectedDate.toISOString().split('T')[0];
          
          // Calculate total progress
          const totalProgress = editableSources.reduce((total, source) => total + source.value, 0);
          
          // If total is zero, remove entry completely
          if (totalProgress === 0 && editableSources.length === 0) {
            if (userData.dailyEntries && userData.dailyEntries[dateKey]) {
              delete userData.dailyEntries[dateKey];
            }
          } else {
            // Create/update entry with new values
            userData.dailyEntries[dateKey] = {
              date: dateKey,
              progress: totalProgress,
              segments: editableSources
            };
          }
          
          // Save back to localStorage
          localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
        }
      }
      
      // Success - let parent component know
      onSave();
    } catch (error) {
      console.error('Error updating day income:', error);
      alert('Failed to update income sources. Please try again.');
    } finally {
      setIsLoading(false);
      setIsEditing(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            Edit Income for {selectedDate.toLocaleDateString()}
          </h2>
          <button 
            className={styles.closeButton} 
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className={styles.modalContent}>
          <div className={styles.editSourcesList}>
            {editableSources.length > 0 ? (
              editableSources.map(source => (
                <div key={source.id} className={styles.editSourceItem}>
                  <div className={styles.sourceInfo}>
                    <div 
                      className={styles.sourceColor}
                      style={{ backgroundColor: source.color }}
                    />
                    <span className={styles.sourceName}>{source.name}</span>
                  </div>
                  
                  <div className={styles.sourceActions}>
                    <input
                      type="text"
                      className={styles.amountInput}
                      value={formatZAR(source.value)}
                      onChange={(e) => handleUpdateAmount(source.id, e.target.value)}
                    />
                    
                    <button 
                      className={styles.deleteButton}
                      onClick={() => handleRemoveSource(source.id)}
                      aria-label="Delete source"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.noSources}>
                No income sources found for this day.
              </div>
            )}
          </div>
          
          <div className={styles.totalContainer}>
            <span className={styles.totalLabel}>Total:</span>
            <span className={styles.totalValue}>
              {formatZAR(editableSources.reduce((total, source) => total + source.value, 0))}
            </span>
          </div>
        </div>
        
        <div className={styles.modalFooter}>
          <button 
            className={styles.cancelButton}
            onClick={onClose}
            disabled={isEditing}
          >
            Cancel
          </button>
          <button 
            className={styles.saveButton}
            onClick={handleSave}
            disabled={isEditing}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditDayModal;