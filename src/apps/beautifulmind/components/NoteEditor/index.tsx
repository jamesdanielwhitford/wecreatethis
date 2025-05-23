// src/apps/beautifulmind/components/NoteEditor/index.tsx

import React, { useState, useEffect } from 'react';
import { Note, NoteFormData } from '../../types/notes.types';
import styles from './styles.module.css';

interface NoteEditorProps {
  note?: Note | null;
  onSave: (data: NoteFormData) => Promise<void>;
  onCancel: () => void;
  isCreating?: boolean;
}

const NoteEditor: React.FC<NoteEditorProps> = ({ note, onSave, onCancel, isCreating }) => {
  const [formData, setFormData] = useState<NoteFormData>({
    title: '',
    content: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (note) {
      setFormData({
        title: note.title,
        content: note.content
      });
    }
  }, [note]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() && !formData.content.trim()) {
      setError('Please add a title or content');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onSave(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className={styles.editor} onSubmit={handleSubmit}>
      <input
        type="text"
        className={styles.titleInput}
        placeholder="Note title..."
        value={formData.title}
        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
        autoFocus={isCreating}
      />
      
      <textarea
        className={styles.contentTextarea}
        placeholder="Start writing..."
        value={formData.content}
        onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
      />

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
          disabled={saving}
        >
          {saving ? 'Saving...' : (isCreating ? 'Create Note' : 'Save Changes')}
        </button>
      </div>
    </form>
  );
};

export default NoteEditor;