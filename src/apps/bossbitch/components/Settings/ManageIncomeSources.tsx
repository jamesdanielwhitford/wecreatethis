// src/apps/bossbitch/components/Settings/ManageIncomeSources.tsx
import React, { useState } from 'react';
import { Edit2, X, Check } from 'lucide-react';
import { IncomeSource } from '../../types/goal.types';
import styles from './styles.module.css';

interface ManageIncomeSourcesProps {
  incomeSources: IncomeSource[];
  onUpdateSource: (id: string, updates: Partial<Omit<IncomeSource, 'id'>>) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
}

// Predefined color options - use the same ones from ColorPicker.tsx
const COLOR_OPTIONS = [
  // Red shades
  '#FF6B6B', '#FF5252', '#FF4081', '#F44336', '#E91E63',
  // Purple shades
  '#9C27B0', '#7C3AED', '#673AB7', '#5E35B1', '#4527A0', 
  // Blue shades
  '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4', '#45B7D1',
  // Green shades
  '#4ECDC4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39',
  // Yellow/Orange shades
  '#FFEB3B', '#FFC107', '#FF9800', '#FF5722', '#FFD700'
];

const ManageIncomeSources: React.FC<ManageIncomeSourcesProps> = ({
  incomeSources,
  onUpdateSource,
  onClose,
  isLoading
}) => {
  // State to track which source is being edited
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [error, setError] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [updatingSource, setUpdatingSource] = useState(false);

  // Start editing a source
  const startEditing = (source: IncomeSource) => {
    setEditingId(source.id);
    setEditName(source.name);
    setEditColor(source.color);
    setError('');
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
    setEditColor('');
    setError('');
    setShowColorPicker(false);
  };

  // Save changes to a source
  const saveChanges = async (id: string) => {
    if (!editName.trim()) {
      setError('Name cannot be empty');
      return;
    }
  
    try {
      setUpdatingSource(true);
      
      // Get the original source to preserve properties we're not updating
      const originalSource = getOriginalSource(id);
      
      // Build updates object preserving value
      const updates = {
        name: editName.trim(),
        color: editColor
      };
      
      // Ensure we don't lose the value property during updates
      if (originalSource && originalSource.value !== undefined) {
        updates.value = originalSource.value;
      }
      
      await onUpdateSource(id, updates);
      cancelEditing();
    } catch (err) {
      setError('Failed to update income source');
      console.error('Error updating income source:', err);
    } finally {
      setUpdatingSource(false);
    }
  };

  // Handle selecting a color
  const handleSelectColor = (color: string) => {
    setEditColor(color);
    setShowColorPicker(false);
  };

  // Find the original source for a given ID
  const getOriginalSource = (id: string) => {
    return incomeSources.find(source => source.id === id);
  };

  return (
    <div className={styles.modalOverlay} onClick={() => onClose()}>
      <div 
        className={styles.modalContent} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Manage Income Sources</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={24} />
          </button>
        </div>

        {incomeSources.length === 0 ? (
          <p className={styles.emptyState}>No income sources available. Add income sources by recording income in the app.</p>
        ) : (
          <div className={styles.sourcesList}>
            {incomeSources.map(source => (
              <div key={source.id} className={styles.sourceItem}>
                {editingId === source.id ? (
                  // Edit mode
                  <div className={styles.sourceEditContainer}>
                    <div className={styles.sourceEditForm}>
                      <div 
                        className={styles.editSourceColor} 
                        style={{ backgroundColor: editColor }}
                        onClick={() => setShowColorPicker(true)}
                      />
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className={styles.sourceNameInput}
                        placeholder="Source name"
                      />
                    </div>
                    
                    <div className={styles.sourceActions}>
                      <button 
                        onClick={() => saveChanges(source.id)}
                        className={styles.actionIconButton}
                        disabled={isLoading || updatingSource}
                        aria-label="Save changes"
                      >
                        <Check size={18} />
                      </button>
                      <button 
                        onClick={cancelEditing}
                        className={styles.actionIconButton}
                        disabled={isLoading || updatingSource}
                        aria-label="Cancel editing"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <div className={styles.sourceViewContainer}>
                    <div className={styles.sourceInfo}>
                      <div 
                        className={styles.sourceColor} 
                        style={{ backgroundColor: source.color }}
                      />
                      <span className={styles.sourceName}>{source.name}</span>
                    </div>
                    
                    <button
                      onClick={() => startEditing(source)}
                      className={styles.actionIconButton}
                      disabled={isLoading || !!editingId || updatingSource}
                      aria-label={`Edit ${source.name}`}
                    >
                      <Edit2 size={18} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {error && (
          <p className={styles.error}>{error}</p>
        )}
        
        {updatingSource && (
          <p className={styles.updatingMessage}>
            Updating income source across all entries...
          </p>
        )}

        <button
          onClick={onClose}
          className={styles.doneButton}
          disabled={isLoading || updatingSource}
        >
          Done
        </button>

        {/* Color picker modal */}
        {showColorPicker && (
          <div className={styles.colorPickerModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.colorPickerHeader}>
              <h3 className={styles.colorPickerTitle}>Select Color</h3>
              <button 
                onClick={() => setShowColorPicker(false)} 
                className={styles.closeButton}
                aria-label="Close color picker"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className={styles.colorGrid}>
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`${styles.colorGridItem} ${editColor === color ? styles.activeColor : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleSelectColor(color)}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageIncomeSources;