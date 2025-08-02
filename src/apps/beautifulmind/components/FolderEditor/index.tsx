// src/apps/beautifulmind/components/FolderEditor/index.tsx

import React, { useState, useEffect } from 'react';
import { Folder, FolderFormData } from '../../types/notes.types';
import styles from './styles.module.css';

interface FolderEditorProps {
  folder?: Folder | null;
  onSave: (data: FolderFormData) => Promise<Folder>;
  onCancel: () => void;
  isCreating?: boolean;
}

const FolderEditor: React.FC<FolderEditorProps> = ({ 
  folder, 
  onSave, 
  onCancel, 
  isCreating = false
}) => {
  const [formData, setFormData] = useState<FolderFormData>({
    title: '',
    description: '',
    parent_folder_id: null
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (folder) {
      setFormData({
        title: folder.title,
        description: folder.description || '',
        parent_folder_id: folder.parent_folder_id || null
      });
    } else if (!isCreating) {
      // Reset form when folder is null but not creating (shouldn't happen, but safety)
      setFormData({ title: '', description: '', parent_folder_id: null });
    }
  }, [folder, isCreating]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Folder title is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      await onSave(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save folder');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className={styles.editor} onSubmit={handleSubmit}>
      <div className={styles.header}>
        <div className={styles.folderIcon}>📁</div>
        <h2 className={styles.title}>
          {isCreating ? 
            (formData.parent_folder_id ? 'Create New Subfolder' : 'Create New Semantic Folder') : 
            'Edit Folder'
          }
        </h2>
      </div>

      {/* Show parent folder info when creating a subfolder */}
      {isCreating && formData.parent_folder_id && (
        <div className={styles.parentInfo}>
          <span className={styles.parentLabel}>📁 Creating subfolder in:</span>
          <span className={styles.parentName}>
            {folder?.title || 'Parent Folder'}
          </span>
        </div>
      )}

      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="folder-title">
          Folder Title *
        </label>
        <input
          id="folder-title"
          type="text"
          className={styles.titleInput}
          placeholder="e.g., Machine Learning Research"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          autoFocus={isCreating}
          maxLength={100}
        />
        <span className={styles.inputHint}>
          Keep it descriptive - this helps the AI find related notes
        </span>
      </div>
      
      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="folder-description">
          Description
        </label>
        <textarea
          id="folder-description"
          className={styles.descriptionTextarea}
          placeholder="Describe what types of notes should appear in this folder... 

For example: 'Research papers, tutorials, and project notes about neural networks, deep learning algorithms, transformer architectures, and AI model training techniques.'"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={6}
          maxLength={1000}
        />
        <span className={styles.inputHint}>
          📊 This description is used for semantic search - be specific about topics, keywords, and concepts
        </span>
      </div>

      <div className={styles.infoCard}>
        <div className={styles.infoIcon}>🧠</div>
        <div className={styles.infoContent}>
          <h4 className={styles.infoTitle}>How Semantic Folders Work</h4>
          <p className={styles.infoText}>
            Unlike traditional folders, this smart folder will automatically show notes that are 
            semantically related to your title and description. The AI analyzes the content of your 
            notes (including transcriptions and image descriptions) to find relevant matches.
          </p>
        </div>
      </div>

      {error && (
        <div className={styles.error}>{error}</div>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.cancelButton}
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={styles.saveButton}
          disabled={saving || !formData.title.trim()}
        >
          {saving ? 'Saving...' : (isCreating ? 'Create Folder' : 'Save Changes')}
        </button>
      </div>
    </form>
  );
};

export default FolderEditor;