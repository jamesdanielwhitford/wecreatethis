/**
 * This service manages image storage in IndexedDB
 */

export const indexedDBService = {
    dbName: 'BeautifulMindDB',
    imageStoreName: 'images',
    version: 1,
    
    /**
     * Initialize the database
     */
    initDB: (): Promise<IDBDatabase> => {
      return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
          reject('IndexedDB is not supported in this browser');
          return;
        }
        
        const request = window.indexedDB.open(indexedDBService.dbName, indexedDBService.version);
        
        request.onerror = (event) => {
          reject(`Database error: ${(event.target as IDBRequest).error}`);
        };
        
        request.onsuccess = (event) => {
          resolve((event.target as IDBRequest).result);
        };
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBRequest).result;
          
          // Create an object store for images if it doesn't exist
          if (!db.objectStoreNames.contains(indexedDBService.imageStoreName)) {
            db.createObjectStore(indexedDBService.imageStoreName, { keyPath: 'id' });
          }
        };
      });
    },
    
    /**
     * Save an image to IndexedDB
     */
    saveImage: async (imageId: string, imageData: string): Promise<string> => {
      try {
        // Compress the image to WebP format
        const compressedImage = await indexedDBService.compressImage(imageData);
        
        const db = await indexedDBService.initDB();
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([indexedDBService.imageStoreName], 'readwrite');
          const store = transaction.objectStore(indexedDBService.imageStoreName);
          
          const request = store.put({
            id: imageId,
            data: compressedImage,
            timestamp: Date.now()
          });
          
          request.onsuccess = () => {
            resolve(imageId);
          };
          
          request.onerror = (event) => {
            reject(`Error saving image: ${(event.target as IDBRequest).error}`);
          };
        });
      } catch (error) {
        console.error('Error in saveImage:', error);
        throw error;
      }
    },
    
    /**
     * Get an image from IndexedDB
     */
    getImage: async (imageId: string): Promise<string | null> => {
      try {
        const db = await indexedDBService.initDB();
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([indexedDBService.imageStoreName], 'readonly');
          const store = transaction.objectStore(indexedDBService.imageStoreName);
          
          const request = store.get(imageId);
          
          request.onsuccess = () => {
            if (request.result) {
              resolve(request.result.data);
            } else {
              resolve(null);
            }
          };
          
          request.onerror = (event) => {
            reject(`Error getting image: ${(event.target as IDBRequest).error}`);
          };
        });
      } catch (error) {
        console.error('Error in getImage:', error);
        return null;
      }
    },
    
    /**
     * Delete an image from IndexedDB
     */
    deleteImage: async (imageId: string): Promise<void> => {
      try {
        const db = await indexedDBService.initDB();
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([indexedDBService.imageStoreName], 'readwrite');
          const store = transaction.objectStore(indexedDBService.imageStoreName);
          
          const request = store.delete(imageId);
          
          request.onsuccess = () => {
            resolve();
          };
          
          request.onerror = (event) => {
            reject(`Error deleting image: ${(event.target as IDBRequest).error}`);
          };
        });
      } catch (error) {
        console.error('Error in deleteImage:', error);
      }
    },
    
    /**
     * Compress an image to WebP format
     */
    compressImage: async (imageData: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        try {
          const img = new Image();
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
    }
  };