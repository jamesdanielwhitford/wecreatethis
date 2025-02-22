'use client';

// src/apps/bossbitch/components/CelebrationModal/index.tsx
import React, { useState, useEffect } from 'react';
import { X, Music } from 'lucide-react';
import styles from './styles.module.css';

interface CelebrationModalProps {
  onClose: () => void;
}

interface CelebrationContent {
  quote: string;
  song: {
    title: string;
    artist: string;
    url: string;
  };
}

const CelebrationModal: React.FC<CelebrationModalProps> = ({ onClose }) => {
  const [content, setContent] = useState<CelebrationContent | null>(null);

  // Updated quotes and songs organized by day of week (0 = Sunday, 6 = Saturday)
  const celebrationContent: CelebrationContent[][] = [
    // Sunday: Self-Worth & Celebrating Success
    [
      {
        quote: "I see it, I like it, I want it, I got it. 💎",
        song: {
          title: "7 Rings",
          artist: "Ariana Grande",
          url: "https://www.youtube.com/watch?v=QYh6mYIJG2Y"
        }
      },
      {
        quote: "I work for myself, so i guess I work for a boss 🤷🏻‍♀️",
        song: {
          title: "Feel A Way",
          artist: "2 Chainz",
          url: "https://www.youtube.com/watch?v=f6vg4ZVyUW8&t=42s"
        }
      }
    ],
    // Monday: Boss Moves & Money Vibes
    [
      {
        quote: "Work work work work work!",
        song: {
          title: "Work",
          artist: "Rihanna",
          url: "https://www.youtube.com/watch?v=puxjq3p-fU0"
        }
      },
      {
        quote: "Classy, bougie, bossy. All day. 🔥",
        song: {
          title: "Savage Remix (feat. Beyoncé)",
          artist: "Megan Thee Stallion",
          url: "https://www.youtube.com/watch?v=lEIqjoO0-Bs"
        }
      }
    ],
    // Tuesday: Confidence & Hustle Energy
    [
      {
        quote: "Bad bitch contest? It wouldn't be no contest 💅",
        song: {
          title: "Hot Shit!",
          artist: "Cardi B",
          url: "https://www.youtube.com/watch?v=vjbBaai9ZA8&t=33s"
        }
      },
      {
        quote: "Wait till I get my money right!",
        song: {
          title: "Can't Tell Me Nothing",
          artist: "Kanye West",
          url: "https://youtu.be/E58qLXBfLrs?feature=shared&t=55"
        }
      }
    ],
    // Wednesday: Ambition & Power Moves
    [
      {
        quote: "I see it, I want it, I stunt. 💸",
        song: {
          title: "Formation",
          artist: "Beyoncé",
          url: "https://www.youtube.com/watch?v=WDZJPJV__bQ"
        }
      },
    ],
    // Thursday: Boss Bitch Energy
    [
      {
        quote: "Walking like a boss because you are the boss. 👑",
        song: {
          title: "Boss Bitch",
          artist: "Doja Cat",
          url: "https://www.youtube.com/watch?v=RsW66teC0BQ"
        }
      },
    ],
    // Friday: Money & Ambition Vibes
    [
      {
        quote: "Baby WORK IT!",
        song: {
          title: "Work It",
          artist: "Missy Elliot",
          url: "https://youtu.be/cjIvu7e6Wq8"
        }
      },
    ],
    // Saturday: Ultimate Celebration
    [
      {
        quote: "Go to my tailor, got me dripped. I'm too swift, don't tell Taylor 'bout this sh-",
        song: {
          title: "Taylor Swif",
          artist: "A$AP Rocky",
          url: "https://www.youtube.com/watch?v=5URefVYaJrA&t=52s"
        }
      },
    ]
  ];

  useEffect(() => {
    const dayOfWeek = new Date().getDay();
    const todaysOptions = celebrationContent[dayOfWeek];
    const randomIndex = Math.floor(Math.random() * todaysOptions.length);
    setContent(todaysOptions[randomIndex]);
    generateConfetti();
  }, []);

  const generateConfetti = () => {
    // Confetti effect placeholder
  };

  if (!content) {
    return (
      <div className={styles.modal}>
        <div className={styles.loading}>Loading your celebration...</div>
      </div>
    );
  }

  return (
    <div className={styles.modal}>
      <div className={styles.confetti}>
        {Array.from({ length: 50 }).map((_, i) => {
          const style = {
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            backgroundColor: `hsl(${Math.random() * 360}deg, 70%, 60%)`,
          };
          return <div key={i} className={styles.confettiPiece} style={style} />;
        })}
      </div>

      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>🎉 Goal Achieved! 🎉</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.content}>
          <p className={styles.quote}>{content.quote}</p>

          <div className={styles.songContainer}>
            <p className={styles.songLabel}>Celebration Song:</p>
            <p className={styles.songTitle}>{content.song.title}</p>
            <p className={styles.songArtist}>by {content.song.artist}</p>
            <a
              href={content.song.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.playButton}
            >
              <Music size={20} />
              Play on YouTube
            </a>
          </div>

          <button onClick={onClose} className={styles.continueButton}>
            Keep Crushing It!
          </button>
        </div>
      </div>
    </div>
  );
};

export default CelebrationModal;
