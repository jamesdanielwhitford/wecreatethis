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

  // Quotes and songs organized by day of week (0 = Sunday, 6 = Saturday)
  const celebrationContent: CelebrationContent[][] = [
    // Sunday content
    [
      {
        quote: "Sunday success feels different! Start your week knowing you're already winning! 💪",
        song: {
          title: "Good as Hell",
          artist: "Lizzo",
          url: "https://www.youtube.com/watch?v=vuq-VAiW9kw"
        }
      },
      {
        quote: "A Sunday win sets the tone for the entire week. Go off, Boss Bitch! ✨",
        song: {
          title: "Sunday Morning",
          artist: "Maroon 5",
          url: "https://www.youtube.com/watch?v=S2Cti12XBw4"
        }
      }
    ],
    // Monday content
    [
      {
        quote: "Crushing Monday goals? You're not a boss bitch, you're THE boss bitch! 👑",
        song: {
          title: "Motivation",
          artist: "Normani",
          url: "https://www.youtube.com/watch?v=FKXSh14svlQ"
        }
      },
      {
        quote: "Monday hustle pays off! Your bank account? Thriving. You? Unstoppable. 🚀",
        song: {
          title: "Boss Lady",
          artist: "Chlöe",
          url: "https://www.youtube.com/watch?v=qv_bzZeYeUE"
        }
      }
    ],
    // Tuesday content
    [
      {
        quote: "On Tuesdays, we make money moves like a true queen! 💅",
        song: {
          title: "Money",
          artist: "Cardi B",
          url: "https://www.youtube.com/watch?v=zUOh09GoQgk"
        }
      },
      {
        quote: "Tuesday triumph unlocked! You're crushing these goals like it's nothing! 💯",
        song: {
          title: "Savage",
          artist: "Megan Thee Stallion",
          url: "https://www.youtube.com/watch?v=THht6KliJ3Q"
        }
      }
    ],
    // Wednesday content
    [
      {
        quote: "Wednesday win secured! They said you couldn't, but you DID! 💪",
        song: {
          title: "Run The World (Girls)",
          artist: "Beyoncé",
          url: "https://www.youtube.com/watch?v=VBmMU_iwe6U"
        }
      },
      {
        quote: "Winning Wednesdays are your specialty. This is what excellence looks like! ⭐",
        song: {
          title: "Confident",
          artist: "Demi Lovato",
          url: "https://www.youtube.com/watch?v=cwLRQn61oUY"
        }
      }
    ],
    // Thursday content
    [
      {
        quote: "Boss moves only on Thursdays! And you just made a big one! 🔥",
        song: {
          title: "Independent Women, Pt. I",
          artist: "Destiny's Child",
          url: "https://www.youtube.com/watch?v=0lPQZni7I18"
        }
      },
      {
        quote: "Thursday hustle pays off! Another goal crushed! What can't you do? 🚀",
        song: {
          title: "Work Bitch",
          artist: "Britney Spears",
          url: "https://www.youtube.com/watch?v=pt8VYOfr8To"
        }
      }
    ],
    // Friday content
    [
      {
        quote: "Friday wins hit different! You're not just meeting goals, you're setting new standards! 📈",
        song: {
          title: "Survivor",
          artist: "Destiny's Child",
          url: "https://www.youtube.com/watch?v=Wmc8bQoL-J0"
        }
      },
      {
        quote: "Finishing the week strong! This is YOUR empire and you're running it like a BOSS! 👑",
        song: {
          title: "Formation",
          artist: "Beyoncé",
          url: "https://www.youtube.com/watch?v=WDZJPJV__bQ"
        }
      }
    ],
    // Saturday content
    [
      {
        quote: "Weekend warrior! Making money while others are resting. That's BOSS energy! 💰",
        song: {
          title: "7 rings",
          artist: "Ariana Grande",
          url: "https://www.youtube.com/watch?v=QYh6mYIJG2Y"
        }
      },
      {
        quote: "Saturday success is special. Keep stacking that wealth, queen! 👑",
        song: {
          title: "Level Up",
          artist: "Ciara",
          url: "https://www.youtube.com/watch?v=Dh-ULbQmmF8"
        }
      }
    ]
  ];

  useEffect(() => {
    // Get current day of week (0-6)
    const dayOfWeek = new Date().getDay();
    
    // Get content options for this day
    const todaysOptions = celebrationContent[dayOfWeek];
    
    // Select random content from today's options
    const randomIndex = Math.floor(Math.random() * todaysOptions.length);
    setContent(todaysOptions[randomIndex]);
    
    // Trigger confetti effect
    generateConfetti();
  }, []);

  // Generate confetti effect
  const generateConfetti = () => {
    // Implementation would go here if using a confetti library
    // For now, we'll use CSS animations
  };

  // If content isn't loaded yet, show loading state
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
        {/* Close button */}
        <div className={styles.header}>
          <h2 className={styles.title}>🎉 Goal Achieved! 🎉</h2>
          <button 
            onClick={onClose}
            className={styles.closeButton}
          >
            <X size={24} />
          </button>
        </div>

        {/* Celebration content */}
        <div className={styles.content}>
          <p className={styles.quote}>
            {content.quote}
          </p>

          <div className={styles.songContainer}>
            <p className={styles.songLabel}>Celebration Song:</p>
            <p className={styles.songTitle}>
              {content.song.title}
            </p>
            <p className={styles.songArtist}>
              by {content.song.artist}
            </p>
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