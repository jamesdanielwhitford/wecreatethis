// src/apps/openmind/components/VoiceRecorder/index.tsx

import React from 'react';
import { VoiceRecording } from '../../types/openmind.types';
import styles from './styles.module.css';

interface VoiceRecorderProps {
  recording: VoiceRecording;
  duration: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  recording,
  duration,
  onStartRecording,
  onStopRecording,
}) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRecordingInstruction = () => {
    if (recording.isRecording) {
      return "Tap to stop recording";
    }
    return "Tap to start voice note";
  };

  return (
    <div className={styles.container}>
      <div className={styles.recordingArea}>
        <button
          className={`${styles.recordButton} ${recording.isRecording ? styles.recording : ''}`}
          onClick={recording.isRecording ? onStopRecording : onStartRecording}
          type="button"
        >
          {recording.isRecording ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C13.1 2 14 2.9 14 4L14 12C14 13.1 13.1 14 12 14C10.9 14 10 13.1 10 12L10 4C10 2.9 10.9 2 12 2M19 11C19 15.4 15.4 19 11 19L11 21L17 21L17 23L7 23L7 21L9 21L9 19C4.6 19 1 15.4 1 11L3 11C3 14.3 5.7 17 9 17L15 17C18.3 17 21 14.3 21 11L19 11Z"/>
            </svg>
          )}
        </button>

        <div className={styles.recordingInfo}>
          <div className={styles.instruction}>
            {getRecordingInstruction()}
          </div>
          
          {recording.isRecording && (
            <div className={styles.duration}>
              {formatDuration(duration)}
            </div>
          )}
          
          {!recording.isRecording && duration === 0 && (
            <div className={styles.hint}>
              Record your thoughts and let AI organize them for you
            </div>
          )}
        </div>
      </div>

      {recording.isRecording && (
        <div className={styles.recordingIndicator}>
          <div className={styles.waveform}>
            <div className={styles.wave}></div>
            <div className={styles.wave}></div>
            <div className={styles.wave}></div>
            <div className={styles.wave}></div>
            <div className={styles.wave}></div>
          </div>
          <span className={styles.recordingText}>Recording...</span>
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;