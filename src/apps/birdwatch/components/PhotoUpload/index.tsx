import { useRef, useState } from 'react';
import { usePhotoUpload } from '../../hooks/usePhotoUpload';
import styles from './styles.module.css';

interface PhotoUploadProps {
  onPhotosUploaded: (photos: string[]) => void;
  maxPhotos?: number;
  existingPhotos?: string[];
}

export default function PhotoUpload({ 
  onPhotosUploaded, 
  maxPhotos = 5, 
  existingPhotos = [] 
}: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isUploading, uploadError, uploadPhotos, validateImageFile } = usePhotoUpload();
  const [dragActive, setDragActive] = useState(false);
  const [previewPhotos, setPreviewPhotos] = useState<string[]>(existingPhotos);

  const remainingSlots = maxPhotos - previewPhotos.length;
  const canUploadMore = remainingSlots > 0;

  const handleFileSelect = async (files: File[]) => {
    if (!canUploadMore) return;

    const filesToUpload = files.slice(0, remainingSlots);
    
    // Validate files first
    for (const file of filesToUpload) {
      const error = validateImageFile(file);
      if (error) {
        alert(error);
        return;
      }
    }

    try {
      const uploadedPhotos = await uploadPhotos(filesToUpload);
      const newPhotos = [...previewPhotos, ...uploadedPhotos];
      setPreviewPhotos(newPhotos);
      onPhotosUploaded(newPhotos);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileSelect(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const removePhoto = (index: number) => {
    const newPhotos = previewPhotos.filter((_, i) => i !== index);
    setPreviewPhotos(newPhotos);
    onPhotosUploaded(newPhotos);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h4 className={styles.title}>Photos</h4>
        <span className={styles.counter}>
          {previewPhotos.length} / {maxPhotos}
        </span>
      </div>

      {previewPhotos.length > 0 && (
        <div className={styles.photoGrid}>
          {previewPhotos.map((photo, index) => (
            <div key={index} className={styles.photoItem}>
              <img src={photo} alt={`Bird photo ${index + 1}`} className={styles.photo} />
              <button
                onClick={() => removePhoto(index)}
                className={styles.removeButton}
                type="button"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {canUploadMore && (
        <div
          className={`${styles.uploadArea} ${dragActive ? styles.dragActive : ''} ${isUploading ? styles.uploading : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={openFileDialog}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileInputChange}
            className={styles.hiddenInput}
            disabled={isUploading || !canUploadMore}
          />

          <div className={styles.uploadContent}>
            {isUploading ? (
              <>
                <div className={styles.spinner} />
                <p>Uploading photos...</p>
              </>
            ) : (
              <>
                <div className={styles.uploadIcon}>📷</div>
                <p className={styles.uploadText}>
                  Click or drag photos here
                </p>
                <p className={styles.uploadSubtext}>
                  JPEG, PNG, WebP up to 10MB each
                  {remainingSlots < maxPhotos && ` (${remainingSlots} more)`}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {uploadError && (
        <div className={styles.error}>
          {uploadError}
        </div>
      )}

      {!canUploadMore && (
        <div className={styles.maxReached}>
          Maximum of {maxPhotos} photos reached
        </div>
      )}
    </div>
  );
}