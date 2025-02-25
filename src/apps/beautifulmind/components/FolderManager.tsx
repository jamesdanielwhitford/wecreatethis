import React, { useState } from 'react';
import styles from './FolderManager.module.css';

interface FolderManagerProps {
  availableTags: string[];
  existingFolderTags: string[];
  onCreateFolder: (folderName: string) => void;
}

export const FolderManager: React.FC<FolderManagerProps> = ({ 
  availableTags, 
  existingFolderTags,
  onCreateFolder
}) => {
  const [newFolderName, setNewFolderName] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Generate tag suggestions excluding tags that are already used as folders
  const getSuggestions = () => {
    return availableTags
      .filter(tag => !existingFolderTags.includes(tag))
      .sort();
  };

  const suggestions = getSuggestions();

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setShowForm(false);
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setNewFolderName(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className={styles.folderManager}>
      {showForm ? (
        <div className={styles.folderForm}>
          <div className={styles.inputContainer}>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => {
                setNewFolderName(e.target.value);
                setShowSuggestions(!!e.target.value);
              }}
              onFocus={() => setShowSuggestions(!!newFolderName)}
              placeholder="Folder name"
              className={styles.folderInput}
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className={styles.suggestions}>
                {suggestions
                  .filter(tag => tag.toLowerCase().includes(newFolderName.toLowerCase()))
                  .map(tag => (
                    <button
                      key={tag}
                      className={styles.suggestionItem}
                      onClick={() => handleSelectSuggestion(tag)}
                    >
                      {tag}
                    </button>
                  ))}
              </div>
            )}
          </div>
          <div className={styles.actionButtons}>
            <button 
              className={styles.cancelButton}
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
            <button 
              className={styles.createButton}
              onClick={handleCreateFolder}
            >
              Create
            </button>
          </div>
        </div>
      ) : (
        <button 
          className={styles.newFolderButton}
          onClick={() => setShowForm(true)}
        >
          <span className={styles.plusIcon}>+</span> New Folder
        </button>
      )}
    </div>
  );
};