import { useState, useCallback } from 'react';

export function usePhotoUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const convertFileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsDataURL(file);
    });
  }, []);

  const validateImageFile = useCallback((file: File): string | null => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      return 'Please select a valid image file (JPEG, PNG, or WebP)';
    }

    if (file.size > maxSize) {
      return 'Image size must be less than 10MB';
    }

    return null;
  }, []);

  const resizeImage = useCallback((file: File, maxWidth: number = 1200, maxHeight: number = 1200, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const uploadPhotos = useCallback(async (files: File[]): Promise<string[]> => {
    setIsUploading(true);
    setUploadError(null);

    try {
      const uploadPromises = files.map(async (file) => {
        const validationError = validateImageFile(file);
        if (validationError) {
          throw new Error(validationError);
        }

        // Resize and compress the image
        return await resizeImage(file);
      });

      const results = await Promise.all(uploadPromises);
      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadError(errorMessage);
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, [validateImageFile, resizeImage]);

  const uploadSinglePhoto = useCallback(async (file: File): Promise<string> => {
    const results = await uploadPhotos([file]);
    return results[0];
  }, [uploadPhotos]);

  return {
    isUploading,
    uploadError,
    uploadPhotos,
    uploadSinglePhoto,
    validateImageFile
  };
}