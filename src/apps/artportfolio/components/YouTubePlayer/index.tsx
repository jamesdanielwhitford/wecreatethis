// First, let's declare the YouTube IFrame API types
declare global {
    interface Window {
      onYouTubeIframeAPIReady: () => void;
      YT: {
        Player: new (
          element: HTMLIFrameElement | string,
          config: {
            videoId: string;
            playerVars?: {
              autoplay?: number;
              controls?: number;
              modestbranding?: number;
              playsinline?: number;
              rel?: number;
            };
          }
        ) => void;
      };
    }
  }
  
  import { useEffect, useRef } from 'react';
  import styles from './styles.module.css';
  
  interface YouTubePlayerProps {
    videoUrl: string;
  }
  
  export default function YouTubePlayer({ videoUrl }: YouTubePlayerProps) {
    const playerRef = useRef<HTMLIFrameElement>(null);
    
    // Extract video ID from URL - add better error handling
    const videoId = videoUrl.split('v=')[1]?.split('&')[0] || '';
    
    useEffect(() => {
      // Skip if no video ID
      if (!videoId) return;
  
      // Load YouTube API if not already loaded
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }
  
      // Initialize player when API is ready
      window.onYouTubeIframeAPIReady = () => {
        if (playerRef.current) {
          new window.YT.Player(playerRef.current, {
            videoId,
            playerVars: {
              autoplay: 1,
              controls: 1,
              modestbranding: 1,
              playsinline: 1,
              rel: 0,
            },
          });
        }
      };
  
      // Cleanup
      return () => {
        window.onYouTubeIframeAPIReady = () => {};
      };
    }, [videoId]);
  
    if (!videoId) {
      return <div className={styles.error}>Invalid YouTube URL</div>;
    }
  
    return (
      <div className={styles.container}>
        <iframe
          ref={playerRef}
          className={styles.iframe}
          src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }