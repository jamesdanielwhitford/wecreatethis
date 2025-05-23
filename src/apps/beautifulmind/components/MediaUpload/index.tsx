// src/apps/beautifulmind/components/MediaUpload/index.tsx

import React, { useRef, useState, useCallback } from 'react';
import { MediaAttachment, UploadProgress } from '../../types/notes.types';
import styles from './styles.module.css';

interface MediaUploadProps {
  onUpload: (files: File[]) => Promise<void>;
  uploads: UploadProgress[];
  existingMedia?: MediaAttachment[];
  onDeleteMedia?: (attachment: MediaAttachment) => void;
  disabled?: boolean;
}

const MediaUpload: React.FC<MediaUploadProps> = ({ 
  onUpload, 
  uploads, 
  existingMedia = [],
  onDeleteMedia,
  disabled = false 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      return isImage || isVideo;
    });
    
    if (validFiles.length > 0) {
      onUpload(validFiles);
    }
  }, [onUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleCameraCapture = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  }, []);

  const handleFileClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  }, []);

  const handlePreview = (url: string) => {
    setPreviewUrl(url);
  };

  const closePreview = () => {
    setPreviewUrl(null);
  };

  return (
    <div className={styles.container}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={(e) => handleFileSelect(e.target.files)}
        className={styles.hiddenInput}
        disabled={disabled}
      />
      
      <div
        className={`${styles.uploadArea} ${isDragging ? styles.dragging : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className={styles.uploadButtons}>
          <button
            type="button"
            onClick={handleFileClick}
            className={styles.uploadButton}
            disabled={disabled}
          >
            📁 Upload Files
          </button>
          <button
            type="button"
            onClick={handleCameraCapture}
            className={styles.uploadButton}
            disabled={disabled}
          >
            📷 Take Photo/Video
          </button>
        </div>
        <p className={styles.dragText}>or drag and drop files here</p>
      </div>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <div className={styles.uploadProgress}>
          {uploads.map((upload, index) => (
            <div key={index} className={styles.progressItem}>
              <span className={styles.fileName}>{upload.fileName}</span>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill} 
                  style={{ width: `${upload.progress}%` }}
                />
              </div>
              {upload.error && (
                <span className={styles.error}>{upload.error}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Existing Media */}
      {existingMedia.length > 0 && (
        <div className={styles.mediaGrid}>
          {existingMedia.map((attachment) => (
            <div key={attachment.id} className={styles.mediaItem}>
              {attachment.media_type === 'image' ? (
                <img
                  src={attachment.url}
                  alt={attachment.file_name}
                  onClick={() => handlePreview(attachment.url!)}
                  className={styles.mediaThumbnail}
                />
              ) : (
                <div 
                  className={styles.videoThumbnail}
                  onClick={() => handlePreview(attachment.url!)}
                >
                  <span className={styles.videoIcon}>🎥</span>
                  <span className={styles.fileName}>{attachment.file_name}</span>
                </div>
              )}
              {onDeleteMedia && (
                <button
                  className={styles.deleteButton}
                  onClick={() => onDeleteMedia(attachment)}
                  aria-label="Delete media"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewUrl && (
        <div className={styles.previewModal} onClick={closePreview}>
          <div className={styles.previewContent} onClick={(e) => e.stopPropagation()}>
            {previewUrl.includes('video') ? (
              <video src={previewUrl} controls className={styles.previewVideo} />
            ) : (
              <img src={previewUrl} alt="Preview" className={styles.previewImage} />
            )}
            <button className={styles.closeButton} onClick={closePreview}>×</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaUpload;