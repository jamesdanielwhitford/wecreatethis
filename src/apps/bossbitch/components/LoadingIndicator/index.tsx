// src/apps/bossbitch/components/LoadingIndicator/index.tsx
import React from 'react';
import { useData } from '../../contexts/DataContext';
import styles from './styles.module.css';

interface LoadingIndicatorProps {
  fullScreen?: boolean;
  size?: 'small' | 'medium' | 'large';
  text?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  fullScreen = false,
  size = 'medium',
  text = 'Loading...'
}) => {
  const { isLoading } = useData();
  
  if (!isLoading) return null;
  
  const containerClass = fullScreen 
    ? styles.fullScreenContainer 
    : styles.inlineContainer;
  
  const spinnerClass = `${styles.spinner} ${styles[`spinner${size.charAt(0).toUpperCase() + size.slice(1)}`]}`;
  
  return (
    <div className={containerClass}>
      <div className={styles.content}>
        <div className={spinnerClass}>
          <div className={styles.dot}></div>
          <div className={styles.dot}></div>
          <div className={styles.dot}></div>
        </div>
        {text && <p className={styles.text}>{text}</p>}
      </div>
    </div>
  );
};

export default LoadingIndicator;