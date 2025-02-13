import { useEffect, useRef } from 'react';
import styles from './styles.module.css';

interface YouTubePlayerProps {
  videoUrl: string;
}

export default function YouTubePlayer({ videoUrl }: YouTubePlayerProps) {
  const playerRef = useRef<HTMLIFrameElement>(null);

  // Extract video ID from URL
  const videoId = videoUrl.split('v=')[1]?.split('&')[0];

  useEffect(() => {
    // Load YouTube API
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    // Initialize player when API is ready
    window.onYouTubeIframeAPIReady = () => {
      new YT.Player(playerRef.current!, {
        videoId,
        playerVars: {
          autoplay: 1,
          controls: 1,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
        },
      });
    };
  }, [videoId]);

  return (
    <div className={styles.container}>
      <iframe
        ref={playerRef}
        className={styles.iframe}
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}