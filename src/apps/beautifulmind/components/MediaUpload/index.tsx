// src/apps/beautifulmind/components/MediaUpload/index.tsx

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { MediaAttachment, UploadProgress, AudioRecording } from '../../types/notes.types';
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
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string>('');
  const [audioRecording, setAudioRecording] = useState<AudioRecording>({
    isRecording: false,
    duration: 0
  });
  const [recordingTimer, setRecordingTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (recordingTimer) {
        clearInterval(recordingTimer);
      }
      if (audioRecording.mediaRecorder) {
        audioRecording.mediaRecorder.stop();
      }
      if (audioRecording.audioUrl) {
        URL.revokeObjectURL(audioRecording.audioUrl);
      }
    };
  }, [recordingTimer, audioRecording.mediaRecorder, audioRecording.audioUrl]);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isAudio = file.type.startsWith('audio/');
      return isImage || isVideo || isAudio;
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

  const handleAudioFileClick = useCallback(() => {
    if (audioInputRef.current) {
      audioInputRef.current.click();
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(blob);
        
        setAudioRecording(prev => ({
          ...prev,
          audioUrl,
          isRecording: false
        }));

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      
      setAudioRecording({
        isRecording: true,
        duration: 0,
        mediaRecorder
      });

      // Start duration timer
      const timer = setInterval(() => {
        setAudioRecording(prev => ({
          ...prev,
          duration: prev.duration + 1
        }));
      }, 1000);

      setRecordingTimer(timer);

    } catch (err) {
      console.error('Failed to start recording:', err);
      alert('Failed to start recording. Please ensure microphone access is granted.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (audioRecording.mediaRecorder && audioRecording.isRecording) {
      audioRecording.mediaRecorder.stop();
      
      if (recordingTimer) {
        clearInterval(recordingTimer);
        setRecordingTimer(null);
      }
    }
  }, [audioRecording.mediaRecorder, audioRecording.isRecording, recordingTimer]);

  const saveRecording = useCallback(async () => {
    if (!audioRecording.audioUrl) return;

    try {
      const response = await fetch(audioRecording.audioUrl);
      const blob = await response.blob();
      const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
      
      await onUpload([file]);
      
      // Clean up
      URL.revokeObjectURL(audioRecording.audioUrl);
      setAudioRecording({
        isRecording: false,
        duration: 0
      });
    } catch (err) {
      console.error('Failed to save recording:', err);
    }
  }, [audioRecording.audioUrl, onUpload]);

  const discardRecording = useCallback(() => {
    if (audioRecording.audioUrl) {
      URL.revokeObjectURL(audioRecording.audioUrl);
    }
    setAudioRecording({
      isRecording: false,
      duration: 0
    });
  }, [audioRecording.audioUrl]);

  const handlePreview = (url: string, type: string) => {
    setPreviewUrl(url);
    setPreviewType(type);
  };

  const closePreview = () => {
    setPreviewUrl(null);
    setPreviewType('');
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
      
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
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
          <button
            type="button"
            onClick={handleAudioFileClick}
            className={styles.uploadButton}
            disabled={disabled}
          >
            🎵 Upload Audio
          </button>
        </div>
        <p className={styles.dragText}>or drag and drop files here</p>
      </div>

      {/* Audio Recording Section */}
      <div className={styles.audioRecording}>
        {!audioRecording.isRecording && !audioRecording.audioUrl && (
          <button
            type="button"
            onClick={startRecording}
            className={`${styles.recordButton} ${styles.startRecord}`}
            disabled={disabled}
          >
            🎤 Start Recording
          </button>
        )}

        {audioRecording.isRecording && (
          <div className={styles.recordingControls}>
            <div className={styles.recordingIndicator}>
              <span className={styles.recordingDot}></span>
              Recording: {formatDuration(audioRecording.duration)}
            </div>
            <button
              type="button"
              onClick={stopRecording}
              className={`${styles.recordButton} ${styles.stopRecord}`}
            >
              ⏹ Stop Recording
            </button>
          </div>
        )}

        {audioRecording.audioUrl && !audioRecording.isRecording && (
          <div className={styles.recordingPreview}>
            <audio controls src={audioRecording.audioUrl} className={styles.audioPlayer} />
            <div className={styles.recordingActions}>
              <button
                type="button"
                onClick={saveRecording}
                className={`${styles.recordButton} ${styles.saveRecord}`}
              >
                ✓ Save Recording
              </button>
              <button
                type="button"
                onClick={discardRecording}
                className={`${styles.recordButton} ${styles.discardRecord}`}
              >
                ✗ Discard
              </button>
            </div>
          </div>
        )}
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
                  onClick={() => handlePreview(attachment.url!, attachment.media_type)}
                  className={styles.mediaThumbnail}
                />
              ) : attachment.media_type === 'video' ? (
                <div 
                  className={styles.videoThumbnail}
                  onClick={() => handlePreview(attachment.url!, attachment.media_type)}
                >
                  <span className={styles.videoIcon}>🎥</span>
                  <span className={styles.fileName}>{attachment.file_name}</span>
                </div>
              ) : (
                <div 
                  className={styles.audioThumbnail}
                  onClick={() => handlePreview(attachment.url!, attachment.media_type)}
                >
                  <span className={styles.audioIcon}>🎵</span>
                  <span className={styles.fileName}>{attachment.file_name}</span>
                  {attachment.duration && (
                    <span className={styles.audioDuration}>
                      {formatDuration(Math.floor(attachment.duration))}
                    </span>
                  )}
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
            {previewType === 'video' ? (
              <video src={previewUrl} controls className={styles.previewVideo} />
            ) : previewType === 'audio' ? (
              <div className={styles.audioPreview}>
                <div className={styles.audioPreviewIcon}>🎵</div>
                <audio src={previewUrl} controls className={styles.previewAudio} />
              </div>
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