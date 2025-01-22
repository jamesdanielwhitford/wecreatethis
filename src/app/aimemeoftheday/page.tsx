"use client"
import styles from './page.module.css';
import Image from 'next/image';
import { useState } from 'react';

export default function AIMemeOfTheDay() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };


  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className={styles.container} onClick={toggleFullscreen}>
      <div className={styles.date}>{formatDate(new Date())}</div>
      <div className={styles.imageWrapper}>
        <Image
          src="/image.jpeg"
          alt="AI Generated Meme"
          width={1200}
          height={1200}
          className={styles.memeImage}
          priority
        />
      </div>
      <button 
        className={styles.helpButton} 
        aria-label="Help"
        onClick={(e) => e.stopPropagation()}
      >
        ?
      </button>
      {isFullscreen && (
        <div className={styles.fullscreenOverlay} onClick={toggleFullscreen}>
          <Image
            src="/image.jpeg"
            alt="AI Generated Meme"
            width={1200}
            height={1200}
            className={styles.fullscreenImage}
            priority
          />
        </div>
      )}
    </div>
  );
}