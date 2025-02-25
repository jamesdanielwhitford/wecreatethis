import React, { useState, useEffect, useRef } from 'react';
import styles from './NoteEditor.module.css';
import { Note } from '../types';
import Image from 'next/image';

interface NoteEditorProps {
  note: Note | null;
  availableTags: string[];
  currentFolder: string | null;
  currentSubfolder: string | null;
  onSave: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ 
  note, 
  availableTags,
  currentFolder,
  currentSubfolder,
  onSave, 
  onCancel 
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'text' | 'image'>('text');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [imageData, setImageData] = useState<string | undefined>(undefined);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressedSize, setCompressedSize] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Load note data if editing an existing note
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setType(note.type);
      setTags([...note.tags]);
      setImageData(note.imageData);
      
      // Calculate size for existing image
      if (note.type === 'image' && note.imageData) {
        const sizeInKB = calculateSizeInKB(note.imageData);
        setCompressedSize(`${sizeInKB} KB`);
      }
    } else {
      // Reset form for a new note
      setTitle('');
      setContent('');
      setType('text');
      
      // Initialize tags based on current context
      const initialTags: string[] = [];
      
      // If we're in a folder, add that tag
      if (currentFolder) {
        initialTags.push(currentFolder);
      }
      
      // If we're in a subfolder, add that tag too
      if (currentSubfolder) {
        initialTags.push(currentSubfolder);
      }
      
      setTags(initialTags);
      setImageData(undefined);
      setCompressedSize(null);
      setOriginalSize(null);
    }
  }, [note, currentFolder, currentSubfolder]);
  
  const calculateSizeInKB = (dataUrl: string): number => {
    // Remove the data URL prefix to get just the base64 string
    const base64 = dataUrl.split(',')[1];
    // Calculate size in bytes (approximate: each Base64 digit represents 6 bits)
    const sizeInBytes = (base64.length * 3) / 4;
    // Convert to KB and round to 1 decimal place
    return Math.round(sizeInBytes / 1024 * 10) / 10;
  };
  
  const handleAddTag = () => {
    if (newTag.trim() !== '' && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };
  
  const handleRemoveTag = (tagToRemove: string) => {
    // Don't allow removing the current folder tag or subfolder tag if we're in those contexts
    if ((currentFolder && tagToRemove === currentFolder) || 
        (currentSubfolder && tagToRemove === currentSubfolder)) {
      return;
    }
    
    setTags(tags.filter(tag => tag !== tagToRemove));
  };
  
  const compressImage = async (imageData: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        // Use the browser's built-in HTML Image element constructor
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Calculate new dimensions (max width/height of 1200px)
          let width = img.width;
          let height = img.height;
          const maxDimension = 1200;
          
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          
          // Set canvas dimensions
          canvas.width = width;
          canvas.height = height;
          
          // Draw image on canvas
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert to WebP with quality of 0.8 (80%)
            const quality = 0.8;
            const webpData = canvas.toDataURL('image/webp', quality);
            resolve(webpData);
          } else {
            reject('Could not get canvas context');
          }
        };
        
        img.onerror = () => {
          reject('Error loading image');
        };
        
        img.src = imageData;
      } catch (error) {
        reject(`Error compressing image: ${error}`);
      }
    });
  };
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setIsCompressing(true);
      
      // Read the file as data URL
      const originalDataUrl = await readFileAsDataURL(file);
      const originalSizeKB = calculateSizeInKB(originalDataUrl);
      setOriginalSize(`${originalSizeKB} KB`);
      
      // Compress the image to WebP
      const compressedDataUrl = await compressImage(originalDataUrl);
      const compressedSizeKB = calculateSizeInKB(compressedDataUrl);
      setCompressedSize(`${compressedSizeKB} KB`);
      
      // Set the compressed image data
      setImageData(compressedDataUrl);
      setType('image');
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Failed to process image. Please try again with a different image.');
    } finally {
      setIsCompressing(false);
    }
  };
  
  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          resolve(event.target.result);
        } else {
          reject('Failed to read file');
        }
      };
      reader.onerror = () => reject('Error reading file');
      reader.readAsDataURL(file);
    });
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
  
  // Filter available tags to exclude already selected ones
  const filteredAvailableTags = availableTags.filter(tag => !tags.includes(tag));

  // Separate context tags (folder/subfolder) from other tags
  const contextTags = tags.filter(tag => 
    (currentFolder && tag === currentFolder) || 
    (currentSubfolder && tag === currentSubfolder)
  );
  
  const regularTags = tags.filter(tag => 
    !(currentFolder && tag === currentFolder) && 
    !(currentSubfolder && tag === currentSubfolder)
  );
  
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
          {isCompressing ? (
            <div className={styles.compressionLoading}>
              <p>Compressing image...</p>
            </div>
          ) : imageData ? (
            <div className={styles.imageContainer}>
              <div className={styles.imagePreview}>
                <Image 
                  src={imageData} 
                  alt="Uploaded" 
                  width={400}
                  height={300}
                  style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain' }}
                />
              </div>
              
              {(originalSize || compressedSize) && (
                <div className={styles.imageSizeInfo}>
                  {originalSize && compressedSize && (
                    <p>Compressed from {originalSize} to {compressedSize}</p>
                  )}
                  {!originalSize && compressedSize && (
                    <p>Image size: {compressedSize}</p>
                  )}
                </div>
              )}
              
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
          
          {filteredAvailableTags.length > 0 && (
            <div className={styles.availableTags}>
              <p className={styles.availableTagsLabel}>Available tags:</p>
              <div className={styles.tagsList}>
                {filteredAvailableTags.map(tag => (
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
          
          {/* Display context (folder/subfolder) tags first if present */}
          {contextTags.length > 0 && (
            <div className={styles.selectedTags}>
              <p className={styles.selectedTagsLabel}>Context tags:</p>
              <div className={styles.tagsList}>
                {contextTags.map(tag => (
                  <div key={tag} className={`${styles.tagChip} ${styles.contextTagChip}`}>
                    <span className={styles.tagName}>{tag}</span>
                    {/* Context tags can't be removed */}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Then display regular tags */}
          {regularTags.length > 0 && (
            <div className={styles.selectedTags}>
              <p className={styles.selectedTagsLabel}>Tags:</p>
              <div className={styles.tagsList}>
                {regularTags.map(tag => (
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