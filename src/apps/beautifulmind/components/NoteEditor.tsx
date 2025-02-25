import React, { useState, useEffect, useRef } from 'react';
import styles from './NoteEditor.module.css';
import { Note } from '../types';
import Image from 'next/image';

interface NoteEditorProps {
  note: Note | null;
  availableTags: string[];
  onSave: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ 
  note, 
  availableTags, 
  onSave, 
  onCancel 
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'text' | 'image'>('text');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [imageData, setImageData] = useState<string | undefined>(undefined);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Load note data if editing an existing note
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setType(note.type);
      setTags([...note.tags]);
      setImageData(note.imageData);
    } else {
      // Reset form for a new note
      setTitle('');
      setContent('');
      setType('text');
      setTags([]);
      setImageData(undefined);
    }
  }, [note]);
  
  const handleAddTag = () => {
    if (newTag.trim() !== '' && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };
  
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setImageData(event.target.result);
        setType('image');
      }
    };
    reader.readAsDataURL(file);
  };
  
  const triggerImageUpload = () => {
    fileInputRef.current?.click();
  };
  
  const handleSave = () => {
    // Validation
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }
    
    if (type === 'text' && !content.trim()) {
      alert('Please enter some content');
      return;
    }
    
    if (type === 'image' && !imageData) {
      alert('Please upload an image');
      return;
    }
    
    onSave({
      title: title.trim(),
      content: content.trim(),
      type,
      tags,
      imageData
    });
  };
  
  return (
    <div className={styles.editorContainer}>
      <div className={styles.editorHeader}>
        <h2 className={styles.editorTitle}>
          {note ? 'Edit Note' : 'Create New Note'}
        </h2>
        <div className={styles.editorActions}>
          <button 
            className={styles.cancelButton}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button 
            className={styles.saveButton}
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
      
      <div className={styles.formGroup}>
        <label htmlFor="title" className={styles.label}>Title</label>
        <input
          id="title"
          type="text"
          className={styles.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title"
        />
      </div>
      
      <div className={styles.formGroup}>
        <label className={styles.label}>Note Type</label>
        <div className={styles.typeSelector}>
          <button
            type="button"
            className={`${styles.typeButton} ${type === 'text' ? styles.active : ''}`}
            onClick={() => setType('text')}
          >
            Text
          </button>
          <button
            type="button"
            className={`${styles.typeButton} ${type === 'image' ? styles.active : ''}`}
            onClick={triggerImageUpload}
          >
            Image
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/*"
            onChange={handleImageUpload}
          />
        </div>
      </div>
      
      {type === 'text' ? (
        <div className={styles.formGroup}>
          <label htmlFor="content" className={styles.label}>Content</label>
          <textarea
            id="content"
            className={styles.textarea}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your note here..."
            rows={10}
          />
        </div>
      ) : (
        <div className={styles.formGroup}>
          <label className={styles.label}>Image</label>
          {imageData ? (
            <div className={styles.imageContainer}>
              <Image 
                src={imageData} 
                alt="Uploaded" 
                className={styles.uploadedImage}
                width={400}
                height={300}
                style={{ maxWidth: '100%', height: 'auto' }}
              />
              <button
                type="button"
                className={styles.changeImageButton}
                onClick={triggerImageUpload}
              >
                Change Image
              </button>
            </div>
          ) : (
            <div 
              className={styles.imageUploadPlaceholder}
              onClick={triggerImageUpload}
            >
              Click to upload an image
            </div>
          )}
          <div className={styles.formGroup}>
            <label htmlFor="imageCaption" className={styles.label}>Caption (optional)</label>
            <textarea
              id="imageCaption"
              className={styles.textarea}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Add a caption for your image..."
              rows={3}
            />
          </div>
        </div>
      )}
      
      <div className={styles.formGroup}>
        <label className={styles.label}>Tags</label>
        <div className={styles.tagsContainer}>
          <div className={styles.tagInput}>
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder="Add tag..."
              className={styles.input}
            />
            <button
              type="button"
              className={styles.addTagButton}
              onClick={handleAddTag}
            >
              Add
            </button>
          </div>
          
          {availableTags.length > 0 && (
            <div className={styles.availableTags}>
              <p className={styles.availableTagsLabel}>Available tags:</p>
              <div className={styles.tagsList}>
                {availableTags
                  .filter(tag => !tags.includes(tag))
                  .map(tag => (
                    <button
                      key={tag}
                      type="button"
                      className={styles.availableTag}
                      onClick={() => setTags([...tags, tag])}
                    >
                      {tag}
                    </button>
                  ))}
              </div>
            </div>
          )}
          
          {tags.length > 0 && (
            <div className={styles.selectedTags}>
              <p className={styles.selectedTagsLabel}>Selected tags:</p>
              <div className={styles.tagsList}>
                {tags.map(tag => (
                  <div key={tag} className={styles.tagChip}>
                    <span className={styles.tagName}>{tag}</span>
                    <button
                      type="button"
                      className={styles.removeTagButton}
                      onClick={() => handleRemoveTag(tag)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};