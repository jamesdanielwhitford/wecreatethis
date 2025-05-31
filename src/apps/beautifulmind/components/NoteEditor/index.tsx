// src/apps/beautifulmind/components/NoteEditor/index.tsx

import React, { useState, useEffect } from 'react';
import { Note, NoteFormData, MediaAttachment, UploadProgress, PendingMediaFile } from '../../types/notes.types';
import { mediaService } from '../../utils/api';
import MediaUpload from '../MediaUpload';
import styles from './styles.module.css';

interface NoteEditorProps {
  note?: Note | null;
  onSave: (data: NoteFormData) => Promise<Note>;
  onCancel: () => void;
  isCreating?: boolean;
  // Lifted media state from parent
  pendingMedia: MediaAttachment[];
  setPendingMedia: React.Dispatch<React.SetStateAction<MediaAttachment[]>>;
  pendingUploads: UploadProgress[];
  setPendingUploads: React.Dispatch<React.SetStateAction<UploadProgress[]>>;
  deletedMediaIds: string[];
  setDeletedMediaIds: React.Dispatch<React.SetStateAction<string[]>>;
  // New file state for creation mode
  pendingFiles: PendingMediaFile[];
  setPendingFiles: React.Dispatch<React.SetStateAction<PendingMediaFile[]>>;
}

const NoteEditor: React.FC<NoteEditorProps> = ({ 
  note, 
  onSave, 
  onCancel, 
  isCreating,
  pendingMedia,
  setPendingMedia,
  pendingUploads,
  setPendingUploads,
  deletedMediaIds,
  setDeletedMediaIds,
  pendingFiles,
  setPendingFiles
}) => {
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
    } else if (!isCreating) {
      // Reset form when note is null but not creating (shouldn't happen, but safety)
      setFormData({ title: '', content: '' });
    }
  }, [note, isCreating]);

  const handleMediaUpload = async (files: File[], shouldTranscribe?: boolean[]) => {
    if (isCreating) {
      // During creation, just store files locally without uploading
      const newPendingFiles: PendingMediaFile[] = files.map((file, index) => {
        let mediaType: 'image' | 'video' | 'audio';
        if (file.type.startsWith('video/')) {
          mediaType = 'video';
        } else if (file.type.startsWith('audio/')) {
          mediaType = 'audio';
        } else {
          mediaType = 'image';
        }

        // Create preview URL for images and videos
        let previewUrl: string | undefined;
        if (mediaType === 'image' || mediaType === 'video') {
          previewUrl = URL.createObjectURL(file);
        }

        return {
          id: `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          file,
          shouldTranscribe: shouldTranscribe?.[index] || false,
          media_type: mediaType,
          preview_url: previewUrl
        };
      });

      setPendingFiles(prev => [...prev, ...newPendingFiles]);
      return;
    }

    // For existing notes (edit mode), upload immediately
    if (!note) return;
    
    const newUploads: UploadProgress[] = files.map((file, index) => ({
      fileName: file.name,
      progress: 0,
      shouldTranscribe: shouldTranscribe?.[index] || false,
      transcriptionStatus: shouldTranscribe?.[index] ? 'not_started' : undefined
    }));
    
    setPendingUploads(prev => [...prev, ...newUploads]);
    
    try {
      // Update progress
      const startIndex = pendingUploads.length;
      files.forEach((_, index) => {
        setPendingUploads(prev => prev.map((u, idx) => 
          idx === startIndex + index ? { ...u, progress: 50 } : u
        ));
      });
      
      // Upload files via API
      const attachments = await mediaService.uploadFiles(note.id, files, shouldTranscribe);
      
      // Update progress to complete
      files.forEach((_, index) => {
        setPendingUploads(prev => prev.map((u, idx) => 
          idx === startIndex + index ? { ...u, progress: 100 } : u
        ));
      });
      
      // Add to pending media (parent state)
      setPendingMedia(prev => [...prev, ...attachments]);
      
      // Remove from uploads after a delay
      setTimeout(() => {
        setPendingUploads(prev => prev.filter((_, idx) => 
          idx < startIndex || idx >= startIndex + files.length
        ));
      }, 1000);
      
    } catch (err) {
      // Update uploads with error
      files.forEach((file, index) => {
        setPendingUploads(prev => prev.map((u, idx) => 
          idx === pendingUploads.length + index 
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
      
      // Remove from UI (parent state)
      setPendingMedia(prev => prev.filter(a => a.id !== attachment.id));
      
      // Delete immediately if not part of original note
      if (!note?.media_attachments?.some(a => a.id === attachment.id)) {
        await mediaService.deleteAttachment(attachment.id);
      }
    } catch (err) {
      setError('Failed to delete media');
    }
  };

  const handleDeletePendingFile = (fileId: string) => {
    setPendingFiles(prev => {
      const fileToDelete = prev.find(f => f.id === fileId);
      if (fileToDelete?.preview_url) {
        URL.revokeObjectURL(fileToDelete.preview_url);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  const handleRetryTranscription = async (attachmentId: string) => {
    try {
      await mediaService.retryTranscription(attachmentId);
      
      // Update the pending media to show pending status
      setPendingMedia(prev => prev.map(attachment => 
        attachment.id === attachmentId
          ? { ...attachment, transcription_status: 'pending', transcription_error: undefined }
          : attachment
      ));
      
      setError(null);
    } catch (err) {
      setError('Failed to retry transcription');
    }
  };

  const uploadPendingFiles = async (noteId: string): Promise<MediaAttachment[]> => {
    if (pendingFiles.length === 0) return [];

    const files = pendingFiles.map(pf => pf.file);
    const shouldTranscribe = pendingFiles.map(pf => pf.shouldTranscribe);

    try {
      const attachments = await mediaService.uploadFiles(noteId, files, shouldTranscribe);
      
      // Clean up preview URLs
      pendingFiles.forEach(pf => {
        if (pf.preview_url) {
          URL.revokeObjectURL(pf.preview_url);
        }
      });

      return attachments;
    } catch (err) {
      console.error('Failed to upload pending files:', err);
      throw err;
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
      
      if (isCreating) {
        // Save the note first
        const savedNote = await onSave(formData);
        
        // Then upload any pending files
        if (pendingFiles.length > 0) {
          await uploadPendingFiles(savedNote.id);
        }
      } else {
        // For existing notes, delete marked media first
        for (const id of deletedMediaIds) {
          const attachment = note?.media_attachments?.find(a => a.id === id);
          if (attachment) {
            await mediaService.deleteAttachment(attachment.id);
          }
        }
        
        await onSave(formData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  // Convert pending files to a format that MediaUpload can display
  const pendingFilesAsMedia: MediaAttachment[] = pendingFiles.map(pf => ({
    id: pf.id,
    note_id: 'temp',
    file_name: pf.file.name,
    file_size: pf.file.size,
    mime_type: pf.file.type,
    storage_path: '',
    media_type: pf.media_type,
    created_at: new Date().toISOString(),
    url: pf.preview_url || '', // Use preview URL
    transcription_status: pf.shouldTranscribe ? 'not_started' : undefined
  }));

  const displayMedia = isCreating ? pendingFilesAsMedia : pendingMedia;

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
        uploads={pendingUploads}
        existingMedia={displayMedia}
        onDeleteMedia={isCreating ? 
          (attachment) => handleDeletePendingFile(attachment.id) : 
          handleDeleteMedia
        }
        onRetryTranscription={!isCreating ? handleRetryTranscription : undefined}
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