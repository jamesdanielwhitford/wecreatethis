// src/apps/beautifulmind/components/NoteEditor/index.tsx

import React, { useState, useEffect } from 'react';
import { Note, NoteFormData, MediaAttachment, UploadProgress, PendingMediaFile } from '../../types/notes.types';
import { mediaService, notesService } from '../../utils/api';
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
  const [generatingTitle, setGeneratingTitle] = useState(false);
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

  const handleMediaUpload = async (files: File[], shouldTranscribe?: boolean[], shouldDescribe?: boolean[], descriptions?: string[]) => {
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
          shouldDescribe: shouldDescribe?.[index] || false,
          description: descriptions?.[index],
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
      transcriptionStatus: shouldTranscribe?.[index] ? 'not_started' : undefined,
      shouldDescribe: shouldDescribe?.[index] || false,
      description: descriptions?.[index],
      descriptionStatus: shouldDescribe?.[index] ? 'not_started' : undefined
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
      const attachments = await mediaService.uploadFiles(note.id, files, shouldTranscribe, shouldDescribe, descriptions);
      
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

  const handleGenerateDescription = async (attachmentId: string) => {
    try {
      await mediaService.generateDescription(attachmentId);
      
      // Update the pending media to show pending status
      setPendingMedia(prev => prev.map(attachment => 
        attachment.id === attachmentId
          ? { ...attachment, description_status: 'pending', description_error: undefined }
          : attachment
      ));
      
      setError(null);
    } catch (err) {
      setError('Failed to generate description');
    }
  };

  const handleUpdateDescription = async (attachmentId: string, description: string) => {
    try {
      const updatedAttachment = await mediaService.updateDescription(attachmentId, description);
      
      // Update the pending media with the new description
      setPendingMedia(prev => prev.map(attachment => 
        attachment.id === attachmentId ? updatedAttachment : attachment
      ));
      
      setError(null);
    } catch (err) {
      setError('Failed to update description');
    }
  };

  const uploadPendingFiles = async (noteId: string): Promise<MediaAttachment[]> => {
    if (pendingFiles.length === 0) return [];

    const files = pendingFiles.map(pf => pf.file);
    const shouldTranscribe = pendingFiles.map(pf => pf.shouldTranscribe);
    const shouldDescribe = pendingFiles.map(pf => pf.shouldDescribe);
    const descriptions = pendingFiles.map(pf => pf.description);

    try {
      const attachments = await mediaService.uploadFiles(noteId, files, shouldTranscribe, shouldDescribe, descriptions);
      
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

  const shouldGenerateTitle = (title: string, content: string, hasMedia: boolean): boolean => {
    const trimmedTitle = title.trim();
    
    // Don't generate if user provided a title
    if (trimmedTitle && trimmedTitle !== 'Untitled Note') {
      return false;
    }
    
    // Generate if there's content or media that could provide context
    return content.trim().length > 0 || hasMedia;
  };

  const generateTitleForNote = async (savedNote: Note): Promise<Note> => {
    try {
      setGeneratingTitle(true);
      const result = await notesService.generateTitle(savedNote.id);
      
      // Update the form data with the generated title
      setFormData(prev => ({ ...prev, title: result.title }));
      
      return result.note;
    } catch (err) {
      console.error('Failed to generate title:', err);
      // Return the original note if title generation fails
      return savedNote;
    } finally {
      setGeneratingTitle(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() && !formData.content.trim() && pendingFiles.length === 0 && pendingMedia.length === 0) {
      setError('Please add a title, content, or media');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      let savedNote: Note;
      
      if (isCreating) {
        // Save the note first
        savedNote = await onSave(formData);
        
        // Upload any pending files
        if (pendingFiles.length > 0) {
          await uploadPendingFiles(savedNote.id);
        }
        
        // Generate title if needed
        const hasMediaForTitle = pendingFiles.length > 0;
        if (shouldGenerateTitle(formData.title, formData.content, hasMediaForTitle)) {
          savedNote = await generateTitleForNote(savedNote);
        }
      } else {
        // For existing notes, delete marked media first
        for (const id of deletedMediaIds) {
          const attachment = note?.media_attachments?.find(a => a.id === id);
          if (attachment) {
            await mediaService.deleteAttachment(attachment.id);
          }
        }
        
        savedNote = await onSave(formData);
        
        // Generate title if needed (check for existing media attachments)
        const hasExistingMedia = (savedNote.media_attachments?.length || 0) > 0;
        if (shouldGenerateTitle(formData.title, formData.content, hasExistingMedia)) {
          savedNote = await generateTitleForNote(savedNote);
        }
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
    transcription_status: pf.shouldTranscribe ? 'not_started' : undefined,
    description: pf.description,
    description_status: pf.shouldDescribe ? 'not_started' : undefined
  }));

  const displayMedia = isCreating ? pendingFilesAsMedia : pendingMedia;

  return (
    <form className={styles.editor} onSubmit={handleSubmit}>
      <div className={styles.titleContainer}>
        <input
          type="text"
          className={styles.titleInput}
          placeholder="Note title... (leave blank for AI-generated title)"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          autoFocus={isCreating}
        />
        {generatingTitle && (
          <div className={styles.titleGeneratingIndicator}>
            🤖 Generating title...
          </div>
        )}
      </div>
      
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
        onGenerateDescription={!isCreating ? handleGenerateDescription : undefined}
        onUpdateDescription={!isCreating ? handleUpdateDescription : undefined}
        disabled={saving || generatingTitle}
      />

      {error && (
        <div className={styles.error}>{error}</div>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.cancelButton}
          onClick={onCancel}
          disabled={saving || generatingTitle}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={styles.saveButton}
          disabled={saving || generatingTitle}
        >
          {saving ? 'Saving...' : generatingTitle ? 'Generating title...' : (isCreating ? 'Create Note' : 'Save Changes')}
        </button>
      </div>
    </form>
  );
};

export default NoteEditor;