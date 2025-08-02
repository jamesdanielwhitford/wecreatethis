// src/apps/openmind/hooks/useVoiceRecording.ts

import { useState, useRef, useCallback } from 'react';
import { VoiceRecording } from '../types/openmind.types';

interface UseVoiceRecordingOptions {
  onRecordingComplete?: (audioBlob: Blob) => void;
}

export function useVoiceRecording(options: UseVoiceRecordingOptions = {}) {
  const [recording, setRecording] = useState<VoiceRecording>({
    isRecording: false,
    duration: 0,
  });
  
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      });
      
      streamRef.current = stream;
      audioChunksRef.current = [];

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: 'audio/webm;codecs=opus' 
        });
        
        const audioUrl = URL.createObjectURL(audioBlob);
        
        setRecording(prev => ({
          ...prev,
          isRecording: false,
          audioBlob,
          audioUrl,
        }));

        // Call the completion callback
        if (options.onRecordingComplete) {
          options.onRecordingComplete(audioBlob);
        }

        // Cleanup
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      
      setRecording(prev => ({
        ...prev,
        isRecording: true,
        mediaRecorder,
      }));

      setDuration(0);

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Unable to access microphone. Please check your permissions.');
    }
  }, [options]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recording.isRecording) {
      mediaRecorderRef.current.stop();
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    setRecording(prev => ({
      ...prev,
      isRecording: false,
    }));
  }, [recording.isRecording]);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    if (recording.audioUrl) {
      URL.revokeObjectURL(recording.audioUrl);
    }
  }, [recording.audioUrl]);

  return {
    recording,
    duration,
    startRecording,
    stopRecording,
    cleanup,
  };
}