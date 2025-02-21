'use client';

// src/apps/bossbitch/components/CelebrationModal/index.tsx
import React, { useState, useEffect } from 'react';
import { X, Music } from 'lucide-react';
import styles from './styles.module.css';

interface CelebrationModalProps {
  onClose: () => void;
}

const CelebrationModal: React.FC<CelebrationModalProps> = ({ onClose }) => {
  const [currentQuote, setCurrentQuote] = useState('');

  const quotes = [
    "You're not a boss bitch, you're THE boss bitch! 👑",
    "Making money moves like a true queen! 💅",
    "They said you couldn't, but you DID! 💪",
    "Your bank account? Thriving. Your goals? Crushed. You? Unstoppable. 🚀",
    "This is what excellence looks like! ⭐",
    "Boss moves only! And you just made a big one! 💯",
    "Another goal crushed! What can't you do? 🔥",
    "You're not just meeting goals, you're setting new standards! 📈",
  ];

  const celebrationSongs = [
    {
      title: "Run The World (Girls)",
      artist: "Beyoncé",
      url: "https://www.youtube.com/watch?v=VBmMU_iwe6U"
    },
    {
      title: "Boss Lady",
      artist: "Chlöe",
      url: "https://www.youtube.com/watch?v=qv_bzZeYeUE"
    },
    {
      title: "Independent Women, Pt. I",
      artist: "Destiny's Child",
      url: "https://www.youtube.com/watch?v=0lPQZni7I18"
    },
  ];

  // Randomly select a song
  const randomSong = celebrationSongs[Math.floor(Math.random() * celebrationSongs.length)];

  useEffect(() => {
    // Initialize with a random quote
    setCurrentQuote(quotes[Math.floor(Math.random() * quotes.length)]);

    // Rotate quotes every 3 seconds
    const interval = setInterval(() => {
      setCurrentQuote(prevQuote => {
        const remainingQuotes = quotes.filter(q => q !== prevQuote);
        return remainingQuotes[Math.floor(Math.random() * remainingQuotes.length)];
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Generate confetti pieces
  const renderConfetti = () => {
    return Array.from({ length: 50 }).map((_, i) => {
      const style = {
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 3}s`,
        backgroundColor: `hsl(${Math.random() * 360}deg, 70%, 60%)`,
      };
      return <div key={i} className={styles.confettiPiece} style={style} />;
    });
  };

  return (
    <div className={styles.modal}>
      <div className={styles.confetti}>
        {renderConfetti()}
      </div>
      
      <div className={styles.container}>
        {/* Close button */}
        <div className={styles.header}>
          <button 
            onClick={onClose}
            className={styles.closeButton}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Celebration content */}
        <div className={styles.content}>
          <h2 className={styles.title}>
            🎉 Goal Achieved! 🎉
          </h2>
          
          <p className={styles.quote}>
            {currentQuote}
          </p>

          <div className={styles.songContainer}>
            <p className={styles.songLabel}>Celebration Song:</p>
            <p className={styles.songTitle}>
              {randomSong.title}
            </p>
            <p className={styles.songArtist}>
              by {randomSong.artist}
            </p>
            <a
              href={randomSong.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.playButton}
            >
              <Music className="w-5 h-5" />
              Play on YouTube
            </a>
          </div>

          <button
            onClick={onClose}
            className={styles.continueButton}
          >
            Keep Crushing It!
          </button>
        </div>
      </div>
    </div>
  );
};

export default CelebrationModal;