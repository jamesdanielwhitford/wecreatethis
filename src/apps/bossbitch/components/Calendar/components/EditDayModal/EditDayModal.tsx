// Modified version of EditDayModal
// src/apps/bossbitch/components/Calendar/components/EditDayModal/EditDayModal.tsx

import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { IncomeSource } from '../../../../types/goal.types';
import { formatZAR, parseZAR, createCurrencyInputHandler } from '../../../../utils/currency';
import { useData } from '../../../../contexts/DataContext';
import { dataService } from '../../../../services/data/dataService';
import styles from './styles.module.css';

interface EditDayModalProps {
  onClose: () => void;
  onSave: () => void;
  selectedDate: Date;
  incomeSources: IncomeSource[];
}

interface EditableSource extends IncomeSource {
  inputValue: string; // Store the formatted input value separately
}

const EditDayModal: React.FC<EditDayModalProps> = ({
  onClose,
  onSave,
  selectedDate,
  incomeSources,
}) => {
  const [editableSources, setEditableSources] = useState<EditableSource[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const { setIsLoading, refreshAllData } = useData();
  
  // Initialize editable sources with the existing ones
  useEffect(() => {
    setEditableSources(incomeSources.map(source => ({
      ...source,
      inputValue: formatZAR(source.value)
    })));
  }, [incomeSources]);

  // Creates an input handler for a specific source ID
  const createSourceInputHandler = (sourceId: string) => {
    return createCurrencyInputHandler((newValue: string) => {
      setEditableSources(prevSources => 
        prevSources.map(source => 
          source.id === sourceId 
            ? { 
                ...source, 
                inputValue: newValue, 
                value: parseZAR(newValue) 
              } 
            : source
        )
      );
    });
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
      // First, delete the existing daily entry
      await dataService.deleteDayEntry(selectedDate);
      
      // If we have sources with values, create a new entry
      if (editableSources.length > 0) {        
        // Add each source individually to ensure proper daily and monthly updates
        for (const source of editableSources) {
          if (source.value > 0) {
            await dataService.addIncomeToDay(selectedDate, source.value, source);
          }
        }
      }

      // Refresh all data to ensure consistency
      await refreshAllData();
      
      // Notify parent of successful save
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
                      value={source.inputValue}
                      onChange={createSourceInputHandler(source.id)}
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