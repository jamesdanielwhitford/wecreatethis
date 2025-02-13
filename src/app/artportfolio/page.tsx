'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';
import PostView from '@/components/PostView';
import { Post } from '@/types/post';
import { fetchPosts } from '@/utils/firebase';

export default function ArtPortfolio() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPosts = async () => {
      const fetchedPosts = await fetchPosts();
      setPosts(fetchedPosts);
      setLoading(false);
    };

    loadPosts();
  }, []);

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      {posts.map((post) => (
        <PostView key={post.id} post={post} />
      ))}
    </div>
  );
}