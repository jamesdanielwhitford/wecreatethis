'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { auth, createPost, uploadImage } from '@/utils/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Post, PostType } from '@/types/post';

export default function AdminPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [postType, setPostType] = useState<PostType>('text');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setIsLoggedIn(true);
    } catch (err) {
      setError('Login failed. Please check your credentials.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate content based on post type
      if (postType === 'image' && !file) {
        throw new Error('Please select an image to upload');
      }
      if ((postType === 'text' || postType === 'video') && !content.trim()) {
        throw new Error(`Please enter ${postType === 'text' ? 'some text' : 'a YouTube URL'}`);
      }

      let finalContent = content;

      if (postType === 'image' && file) {
        finalContent = await uploadImage(file);
      }

      // Create the base post object
      const basePost = {
        type: postType,
        content: finalContent.trim(),
        createdAt: Date.now()
      };

      // Only add alt text for image posts
      const post: Omit<Post, 'id'> = postType === 'image' 
        ? { ...basePost, alt } 
        : basePost;

      await createPost(post);
      router.push('/artportfolio');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to create post. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className={styles.container}>
        <form onSubmit={handleLogin} className={styles.form}>
          <h1>Login</h1>
          {error && <div className={styles.error}>{error}</div>}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
            required
          />
          <button type="submit" className={styles.button}>
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h1>Create New Post</h1>
        {error && <div className={styles.error}>{error}</div>}
        
        <select
          value={postType}
          onChange={(e) => {
            setPostType(e.target.value as PostType);
            setContent('');
            setFile(null);
            setAlt('');
          }}
          className={styles.select}
        >
          <option value="text">Text</option>
          <option value="image">Image</option>
          <option value="video">Video</option>
        </select>

        {postType === 'image' ? (
          <>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className={styles.input}
              required
            />
            <input
              type="text"
              placeholder="Alt text (optional)"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              className={styles.input}
            />
          </>
        ) : postType === 'video' ? (
          <input
            type="text"
            placeholder="YouTube URL (e.g., https://www.youtube.com/watch?v=...)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={styles.input}
            required
          />
        ) : (
          <textarea
            placeholder="Enter your text content here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={styles.textarea}
            required
          />
        )}

        <button 
          type="submit" 
          className={styles.button}
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Post'}
        </button>
      </form>
    </div>
  );
}