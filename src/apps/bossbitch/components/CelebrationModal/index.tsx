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
        quote: "Own your crown and never dim your shine. 👑",
        song: {
          title: "Crown",
          artist: "Kelly Rowland",
          url: "https://www.youtube.com/watch?v=_YF5W9Eo7gk"
        }
      }
    ],
    // Monday: Boss Moves & Money Vibes
    [
      {
        quote: "Who run the world? Girls. 💪",
        song: {
          title: "Run the World (Girls)",
          artist: "Beyoncé",
          url: "https://www.youtube.com/watch?v=VBmMU_iwe6U"
        }
      },
      {
        quote: "Classy, bougie, bossy. All day. 🔥",
        song: {
          title: "Savage Remix (feat. Beyoncé)",
          artist: "Megan Thee Stallion",
          url: "https://www.youtube.com/watch?v=6xW2rkh9v4k"
        }
      }
    ],
    // Tuesday: Confidence & Hustle Energy
    [
      {
        quote: "Because confidence is your superpower. ✨",
        song: {
          title: "Confident",
          artist: "Demi Lovato",
          url: "https://www.youtube.com/watch?v=cwLRQn61oUY"
        }
      },
      {
        quote: "Every day's a chance to level up. 💯",
        song: {
          title: "Level Up",
          artist: "Ciara",
          url: "https://www.youtube.com/watch?v=Dh-ULbQmmF8"
        }
      }
    ],
    // Wednesday: Ambition & Power Moves
    [
      {
        quote: "I see it, I want it, I stunt, yellow bone it. 💸",
        song: {
          title: "Formation",
          artist: "Beyoncé",
          url: "https://www.youtube.com/watch?v=WDZJPJV__bQ"
        }
      },
      {
        quote: "You’ve got the power. 💪",
        song: {
          title: "Power",
          artist: "Little Mix",
          url: "https://www.youtube.com/watch?v=cOQUePka3hE"
        }
      }
    ],
    // Thursday: Boss Bitch Energy
    [
      {
        quote: "Walking like a boss because you are the boss. 👑",
        song: {
          title: "Boss Bitch",
          artist: "Doja Cat",
          url: "https://www.youtube.com/watch?v=RpdBXp8YyrE"
        }
      },
      {
        quote: "Because you’re doing just fine, living your best life. 🌟",
        song: {
          title: "Just Fine",
          artist: "Mary J. Blige",
          url: "https://www.youtube.com/watch?v=yt5SPJcE6sM"
        }
      }
    ],
    // Friday: Money & Ambition Vibes
    [
      {
        quote: "Because making money is a vibe and a statement. 💰",
        song: {
          title: "Money",
          artist: "Cardi B",
          url: "https://www.youtube.com/watch?v=zUOh09GoQgk"
        }
      },
      {
        quote: "A timeless anthem about new beginnings and unstoppable energy. ✨",
        song: {
          title: "Feeling Good",
          artist: "Nina Simone",
          url: "https://www.youtube.com/watch?v=D5Y11hwjMNs"
        }
      }
    ],
    // Saturday: Ultimate Celebration
    [
      {
        quote: "Celebrating feeling good, looking good, and doing good for yourself. 💖",
        song: {
          title: "Good as Hell",
          artist: "Lizzo",
          url: "https://www.youtube.com/watch?v=vuq-VAiW9kw"
        }
      },
      {
        quote: "A vibe for embracing every part of your powerful self. 🌟",
        song: {
          title: "I Am Woman",
          artist: "Emmy Meli",
          url: "https://www.youtube.com/watch?v=tjnq5StX68g"
        }
      }
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
