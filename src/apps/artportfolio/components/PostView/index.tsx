import { useEffect, useRef } from 'react';
import styles from './styles.module.css';
import { Post } from '../../types/post';
import Image from 'next/image';
import YouTubePlayer from '../YouTubePlayer';

interface PostViewProps {
  post: Post;
}

export default function PostView({ post }: PostViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (post.type === 'text' && textRef.current) {
      const text = textRef.current;
      const length = post.content.length;
      // Scale text size based on content length
      const baseSize = Math.max(16, Math.min(64, 1000 / Math.sqrt(length)));
      text.style.fontSize = `${baseSize}px`;
    }
  }, [post]);

  return (
    <div className={styles.container} ref={containerRef}>
      {post.type === 'image' && (
        <div className={styles.imageContainer}>
          <Image
            src={post.content}
            alt={post.alt || ''}
            className={styles.image}
            fill
            sizes="(max-width: 768px) 100vw, 1200px"
            priority
            style={{ objectFit: 'contain' }}
          />
        </div>
      )}
      {post.type === 'video' && (
        <div className={styles.videoContainer}>
          <YouTubePlayer videoUrl={post.content} />
        </div>
      )}
      {post.type === 'text' && (
        <div className={styles.textContainer} ref={textRef}>
          {post.content}
        </div>
      )}
    </div>
  );
}