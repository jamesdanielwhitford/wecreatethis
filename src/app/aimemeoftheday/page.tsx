"use client";

import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Post } from '@/types/firebase';
import styles from './page.module.css';
import Image from 'next/image';
import Link from 'next/link';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

export default function AIMemeOfTheDay() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPosts();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0');
            setCurrentPostIndex(index);
          }
        });
      },
      {
        threshold: 0.5,
        root: scrollContainerRef.current,
      }
    );

    const updateObserver = () => {
      document.querySelectorAll(`.${styles.memeSection}`).forEach((section) => {
        observer.observe(section);
      });
    };

    updateObserver();

    return () => observer.disconnect();
  }, [posts]);

  async function fetchPosts() {
    const q = query(collection(db, "posts"), orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    const fetchedPosts = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Post[];
    setPosts(fetchedPosts);
  }

  const scrollToPost = (index: number) => {
    const sections = document.querySelectorAll(`.${styles.memeSection}`);
    sections[index]?.scrollIntoView({ behavior: 'smooth' });
    setShowDatePicker(false);
  };

  const handleDateSelect = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    const index = posts.findIndex(post => post.date === dateString);
    if (index !== -1) {
      scrollToPost(index);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (!posts.length) return null;

  const currentPost = posts[currentPostIndex];

  return (
    <div className={styles.container}>
      {/* Desktop Layout */}
      <div className={styles.desktopLayout}>
        {/* Left Section */}
        <div className={styles.leftSection}>
          <div 
            className={styles.date}
            onClick={() => setShowDatePicker(true)}
            role="button"
            tabIndex={0}
          >
            {formatDate(currentPost.date)}
          </div>
        </div>

        {/* Center Section */}
        <div className={styles.scrollContainer} ref={scrollContainerRef}>
          {posts.map((post, index) => (
            <section key={post.id} className={styles.memeSection} data-index={index}>
              <div className={styles.memeContainer}>
                <div className={styles.imageContainer}>
                  <Image
                    src={post.imageUrl}
                    alt="AI Generated Meme"
                    width={1200}
                    height={1200}
                    className={styles.memeImage}
                    priority={index === 0}
                    onClick={() => setIsFullscreen(true)}
                  />
                </div>
                {post.caption && (
                  <div className={styles.captionText}>{post.caption}</div>
                )}
              </div>
            </section>
          ))}
        </div>

        {/* Right Section */}
        <div className={styles.rightSection}>
          <button 
            className={styles.helpButton}
            aria-label="Help"
            onClick={() => setShowModal(true)}
          >
            ?
          </button>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className={styles.mobileLayout}>
        {/* Top Section */}
        <div className={styles.topSection}>
          <div 
            className={styles.date}
            onClick={() => setShowDatePicker(true)}
            role="button"
            tabIndex={0}
          >
            {formatDate(currentPost.date)}
          </div>
        </div>

        {/* Center Section */}
        <div className={styles.scrollContainer} ref={scrollContainerRef}>
          {posts.map((post, index) => (
            <section key={post.id} className={styles.memeSection} data-index={index}>
              <div className={styles.memeContainer}>
                <div className={styles.imageContainer}>
                  <Image
                    src={post.imageUrl}
                    alt="AI Generated Meme"
                    width={1200}
                    height={1200}
                    className={styles.memeImage}
                    priority={index === 0}
                    onClick={() => setIsFullscreen(true)}
                  />
                </div>
                {post.caption && (
                  <div className={styles.captionText}>{post.caption}</div>
                )}
              </div>
            </section>
          ))}
        </div>

        {/* Bottom Section */}
        <div className={styles.bottomSection}>
          <button 
            className={styles.helpButton}
            aria-label="Help"
            onClick={() => setShowModal(true)}
          >
            ?
          </button>
        </div>
      </div>

      {showDatePicker && (
        <>
          <div className={styles.overlay} onClick={() => setShowDatePicker(false)} />
          <div className={styles.datePicker}>
            <button 
              className={styles.datePickerClose} 
              onClick={() => setShowDatePicker(false)}
              aria-label="Close date picker"
            >
              ×
            </button>
            <DatePicker
              selected={new Date(currentPost.date)}
              onChange={(date: Date) => handleDateSelect(date)}
              inline
              minDate={new Date(posts[posts.length - 1]?.date)}
              maxDate={new Date(posts[0]?.date)}
              className={styles.dateInput}
            />
            <button 
              className={styles.todayButton}
              onClick={() => {
                const today = new Date();
                handleDateSelect(today);
              }}
            >
              Today
            </button>
          </div>
        </>
      )}

      {showModal && (
        <div className={styles.modal} onClick={() => setShowModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button 
              className={styles.closeButton} 
              onClick={() => setShowModal(false)}
              aria-label="Close modal"
            >
              ×
            </button>
            <h2>Get it?</h2>
            <p>That image was generated by {currentPost.imageCompanyUrl ? (
              <a href={currentPost.imageCompanyUrl} target="_blank" rel="noopener noreferrer">
                {currentPost.imageCompanyName}
              </a>
            ) : currentPost.imageCompanyName}.</p>
            <p>
              Using this prompt{" "}
              <button 
                onClick={() => {
                  setShowModal(false);
                  setShowPromptModal(true);
                }} 
                className={styles.promptButton}
              >
                view prompt
              </button>
              {" "}{currentPost.promptIsContribution ? "contributed" : "generated"} by {currentPost.promptCompanyUrl ? (
                <a href={currentPost.promptCompanyUrl} target="_blank" rel="noopener noreferrer">
                  {currentPost.promptCompanyName}
                </a>
              ) : currentPost.promptCompanyName}
            </p>

            <div className={styles.bottomLinks}>
              <Link href="/share">Share</Link>
              <Link href="/download">Download this app</Link>
            </div>
          </div>
        </div>
      )}

      {showPromptModal && (
        <div className={styles.modal} onClick={() => setShowPromptModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button 
              className={styles.closeButton} 
              onClick={() => setShowPromptModal(false)}
              aria-label="Close prompt modal"
            >
              ×
            </button>
            <h2>Prompt</h2>
            <blockquote>&ldquo;{currentPost.prompt}&rdquo;</blockquote>
          </div>
        </div>
      )}

      {isFullscreen && (
        <div 
          className={styles.fullscreenOverlay} 
          onClick={() => setIsFullscreen(false)}
        >
          <Image
            src={currentPost.imageUrl}
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