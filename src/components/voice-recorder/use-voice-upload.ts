'use client';

import { useState, useCallback } from 'react';

export interface UseVoiceUploadOptions {
  onUploadComplete?: (url: string, duration: number) => void;
  onUploadError?: (error: string) => void;
}

export interface UseVoiceUploadReturn {
  uploadRecording: (blob: Blob, duration: number) => Promise<string | null>;
  isUploading: boolean;
  uploadError: string | null;
  clearError: () => void;
}

export function useVoiceUpload(options: UseVoiceUploadOptions = {}): UseVoiceUploadReturn {
  const { onUploadComplete, onUploadError } = options;
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setUploadError(null);
  }, []);

  const uploadRecording = useCallback(
    async (blob: Blob, duration: number): Promise<string | null> => {
      setIsUploading(true);
      setUploadError(null);

      try {
        const formData = new FormData();
        formData.append('file', blob, 'recording.webm');

        const response = await fetch('/api/upload/audio', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to upload recording');
        }

        const data = await response.json();
        const url = data.url;

        if (onUploadComplete) {
          onUploadComplete(url, duration);
        }

        return url;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload recording';
        setUploadError(errorMessage);

        if (onUploadError) {
          onUploadError(errorMessage);
        }

        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [onUploadComplete, onUploadError]
  );

  return {
    uploadRecording,
    isUploading,
    uploadError,
    clearError,
  };
}

export default useVoiceUpload;
