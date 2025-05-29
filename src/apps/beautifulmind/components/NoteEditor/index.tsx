// src/apps/beautifulmind/components/NoteEditor/index.tsx

import React, { useState, useEffect } from 'react';
import { Note, NoteFormData, MediaAttachment, UploadProgress } from '../../types/notes.types';
import { mediaService } from '../../utils/api';
import MediaUpload from '../MediaUpload';
import styles from './styles.module.css';

interface NoteEditorProps {
  note?: Note | null;
  onSave: (data: NoteFormData, keepMedia?: boolean) => Promise<Note>;
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
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [attachedMedia, setAttachedMedia] = useState<MediaAttachment[]>([]);
  const [deletedMediaIds, setDeletedMediaIds] = useState<string[]>([]);

  useEffect(() => {
    if (note) {
      setFormData({
        title: note.title,
        content: note.content
      });
      setAttachedMedia(note.media_attachments || []);
    } else if (!isCreating) {
      // Reset form when note is null but not creating (shouldn't happen, but safety)
      setFormData({ title: '', content: '' });
      setAttachedMedia([]);
    }
  }, [note, isCreating]);

  const handleMediaUpload = async (files: File[]) => {
    if (!note && !isCreating) return;
    
    // If creating, we'll save the note first
    let noteId = note?.id;
    let currentNote = note;
    
    if (!noteId && isCreating) {
      try {
        const newNote = await onSave(formData, true);
        noteId = newNote.id;
        currentNote = newNote;
        // Note: The parent component should update the note prop, 
        // but we'll use the returned note for immediate operations
      } catch (err) {
        setError('Please save the note before adding media');
        console.log(err);
        return;
      }
    }
    
    if (!noteId) return;
    
    const newUploads: UploadProgress[] = files.map(file => ({
      fileName: file.name,
      progress: 0
    }));
    
    setUploads(prev => [...prev, ...newUploads]);
    
    try {
      // Update progress
      const startIndex = uploads.length;
      files.forEach((_, index) => {
        setUploads(prev => prev.map((u, idx) => 
          idx === startIndex + index ? { ...u, progress: 50 } : u
        ));
      });
      
      // Upload files via API
      const attachments = await mediaService.uploadFiles(noteId, files);
      
      // Update progress to complete
      files.forEach((_, index) => {
        setUploads(prev => prev.map((u, idx) => 
          idx === startIndex + index ? { ...u, progress: 100 } : u
        ));
      });
      
      // Add to attached media
      setAttachedMedia(prev => [...prev, ...attachments]);
      
      // Remove from uploads after a delay
      setTimeout(() => {
        setUploads(prev => prev.filter((_, idx) => 
          idx < startIndex || idx >= startIndex + files.length
        ));
      }, 1000);
      
    } catch (err) {
      // Update uploads with error
      files.forEach((file, index) => {
        setUploads(prev => prev.map((u, idx) => 
          idx === uploads.length + index 
            ? { ...u, error: err instanceof Error ? err.message : 'Upload failed' } 
            : u
        ));
      });
    }
  };

  const handleDeleteMedia = async (attachment: MediaAttachment) => {
    if (!window.confirm('Delete this media?')) return;
    
    try {
      // If it's an existing attachment, mark for deletion
      if (note?.media_attachments?.some(a => a.id === attachment.id)) {
        setDeletedMediaIds(prev => [...prev, attachment.id]);
      }
      
      // Remove from UI
      setAttachedMedia(prev => prev.filter(a => a.id !== attachment.id));
      
      // Delete immediately if not part of original note
      if (!note?.media_attachments?.some(a => a.id === attachment.id)) {
        await mediaService.deleteAttachment(attachment.id);
      }
    } catch (err) {
      setError('Failed to delete media');
      console.log(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() && !formData.content.trim()) {
      setError('Please add a title or content');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      // Delete marked media
      for (const id of deletedMediaIds) {
        const attachment = note?.media_attachments?.find(a => a.id === id);
        if (attachment) {
          await mediaService.deleteAttachment(attachment.id);
        }
      }
      
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
      
      <MediaUpload
        onUpload={handleMediaUpload}
        uploads={uploads}
        existingMedia={attachedMedia}
        onDeleteMedia={handleDeleteMedia}
        disabled={saving}
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