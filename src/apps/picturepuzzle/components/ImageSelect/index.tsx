// src/apps/picturepuzzle/components/ImageSelect/index.tsx

import React, { useState } from 'react';
import styles from './styles.module.css';

// Image category structure
export interface ImageCategory {
  name: string;
  label: string;
  images: string[];
  icon: string; // Emoji to represent the category
}

// Define categories and their images
export const imageCategories: ImageCategory[] = [
  {
    name: 'animals',
    label: 'Anime-ls',
    icon: '🐾',
    images: [
      '/images/picturepuzzle/animals/image1.jpg',
      '/images/picturepuzzle/animals/image2.jpg',
      '/images/picturepuzzle/animals/image3.jpg',
      '/images/picturepuzzle/animals/image4.jpg',
      '/images/picturepuzzle/animals/image5.jpg',
      '/images/picturepuzzle/animals/image6.jpg',
      '/images/picturepuzzle/animals/image7.jpg',
      '/images/picturepuzzle/animals/image8.jpg',
    ]
  },
  {
    name: 'artworks',
    label: 'Art?',
    icon: '🎨',
    images: [
      '/images/picturepuzzle/artworks/image1.jpg',
      '/images/picturepuzzle/artworks/image2.jpg',
      '/images/picturepuzzle/artworks/image3.jpg',
      '/images/picturepuzzle/artworks/image4.jpg',
      '/images/picturepuzzle/artworks/image5.jpg',
      '/images/picturepuzzle/artworks/image6.jpg',
      '/images/picturepuzzle/artworks/image7.jpg',
      '/images/picturepuzzle/artworks/image8.jpg',
    ]
  },
];

// Helper function to get all images from all categories
export const getAllImages = (): string[] => {
  return imageCategories.flatMap(category => category.images);
};

// Helper function to find which category an image belongs to
export const findImageCategory = (imageSrc: string): ImageCategory | null => {
  for (const category of imageCategories) {
    if (category.images.includes(imageSrc)) {
      return category;
    }
  }
  return null;
};

interface ImageSelectProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (imageSrc: string) => void;
  currentImage: string;
}

const ImageSelect: React.FC<ImageSelectProps> = ({
  isOpen,
  onClose,
  onSelectImage,
  currentImage
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ImageCategory | null>(null);
  const currentCategory = findImageCategory(currentImage);
  
  if (!isOpen) return null;

  // Handle category selection
  const handleCategorySelect = (category: ImageCategory) => {
    setSelectedCategory(category);
  };

  // Handle going back to categories
  const handleBack = () => {
    setSelectedCategory(null);
  };

  // Handle image selection
  const handleImageSelect = (imageSrc: string) => {
    onSelectImage(imageSrc);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        {selectedCategory ? (
          // Show images for selected category
          <>
            <div className={styles.modalHeader}>
              <button className={styles.backButton} onClick={handleBack}>
                ← Back
              </button>
              <h2 className={styles.modalTitle}>
                {selectedCategory.icon} {selectedCategory.label}
              </h2>
            </div>
            
            <div className={styles.imagesGrid}>
              {selectedCategory.images.map((imageSrc, index) => (
                <div 
                  key={index}
                  className={`${styles.imageItem} ${imageSrc === currentImage ? styles.selected : ''}`}
                  onClick={() => handleImageSelect(imageSrc)}
                >
                  <div 
                    className={styles.imageThumb}
                    style={{
                      backgroundImage: `url(${imageSrc})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  />
                  {imageSrc === currentImage && (
                    <div className={styles.currentIndicator}>Current</div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          // Show categories
          <>
            <h2 className={styles.modalTitle}>Select Image Category</h2>
            
            <div className={styles.categoriesGrid}>
              {imageCategories.map((category, index) => (
                <div 
                  key={index}
                  className={`${styles.categoryItem} ${currentCategory?.name === category.name ? styles.currentCategory : ''}`}
                  onClick={() => handleCategorySelect(category)}
                >
                  <div className={styles.categoryIcon}>{category.icon}</div>
                  <div className={styles.categoryName}>{category.label}</div>
                  {currentCategory?.name === category.name && (
                    <div className={styles.currentCategoryIndicator}>Current</div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
        
        <button className={styles.closeButton} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default ImageSelect;