// src/apps/picturepuzzle/utils/imageScaling.ts

/**
 * Preloads an image and returns its dimensions
 * @param imageSrc Source URL of the image
 * @returns Promise that resolves to the image dimensions
 */
export const getImageDimensions = (imageSrc: string): Promise<{ width: number, height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ 
          width: img.naturalWidth, 
          height: img.naturalHeight 
        });
      };
      img.onerror = () => {
        reject(new Error(`Failed to load image: ${imageSrc}`));
      };
      img.src = imageSrc;
    });
  };
  
  /**
   * Calculates the aspect ratio for an image to ensure it fits within a square
   * @param imageWidth Original image width
   * @param imageHeight Original image height
   * @param containerSize Size of the container (assumed square)
   * @returns Object with calculated width and height to maintain aspect ratio
   */
  export const calculateScaledDimensions = (
    imageWidth: number, 
    imageHeight: number, 
    containerSize: number
  ): { width: number, height: number } => {
    const aspectRatio = imageWidth / imageHeight;
    
    if (aspectRatio > 1) {
      // Landscape image
      return {
        width: containerSize,
        height: containerSize / aspectRatio
      };
    } else {
      // Portrait or square image
      return {
        width: containerSize * aspectRatio,
        height: containerSize
      };
    }
  };
  
  /**
   * Creates a scaled and centered background positioning for each tile
   * @param tileIndex Index of the tile (0-15)
   * @param imageWidth Original image width
   * @param imageHeight Original image height
   * @param containerSize Size of the square container
   * @returns Background position and size for CSS
   */
  export const getTileBackgroundStyle = (
    tileIndex: number,
    imageWidth: number,
    imageHeight: number,
    containerSize: number
  ): { 
    backgroundSize: string, 
    backgroundPosition: string 
  } => {
    const { width: scaledWidth, height: scaledHeight } = 
      calculateScaledDimensions(imageWidth, imageHeight, containerSize);
    
    // Calculate grid position
    const row = Math.floor(tileIndex / 4);
    const col = tileIndex % 4;
    
    // Calculate centering offsets (if the image doesn't fill the container)
    const horizontalOffset = Math.floor((containerSize - scaledWidth) / 2);
    const verticalOffset = Math.floor((containerSize - scaledHeight) / 2);
    
    // Calculate the position for this specific tile
    const tileSize = containerSize / 4;
    // Fix: Round values to prevent subpixel rendering issues
    const xPosition = Math.floor(-(col * tileSize + horizontalOffset));
    const yPosition = Math.floor(-(row * tileSize + verticalOffset));
    
    return {
      backgroundSize: `${Math.floor(scaledWidth)}px ${Math.floor(scaledHeight)}px`,
      backgroundPosition: `${xPosition}px ${yPosition}px`
    };
  };