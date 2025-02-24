// src/apps/bossbitch/components/GoalAdjustmentModal/index.tsx

import React from 'react';
import styles from './styles.module.css';

interface NotificationProps {
  onClick: () => void;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalGoal: string;
  newGoal: string;
  isDeficit: boolean;
  message: string;
  remainingDays: number;
  adjustmentPerDay: string;
}

export const GoalAdjustmentNotification: React.FC<NotificationProps> = ({ onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={styles.notification}
    >
      <svg 
        className={styles.icon}
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
        />
      </svg>
      <span>Your daily goal has been adjusted</span>
    </div>
  );
};

export const GoalAdjustmentModal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  originalGoal,
  newGoal,
  isDeficit,
  message,
  remainingDays,
  adjustmentPerDay
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className={styles.modal}
      onClick={handleBackdropClick}
    >
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            {isDeficit ? 'Catching Up' : 'You\'re Ahead!'}
          </h3>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
          >
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor"
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div className={styles.content}>
          <div className={`${styles.adjustmentInfo} ${isDeficit ? styles.deficit : styles.surplus}`}>
            <p>Daily goal adjusted from {originalGoal}</p>
            <p>{message}</p>
          </div>
          
          <div className={styles.detailsSection}>
            <div className={styles.detailItem}>
              <span className={styles.label}>Remaining active days:</span>
              <span className={styles.value}>{remainingDays}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.label}>
                {isDeficit ? 'Extra needed per day:' : 'Less needed per day:'}
              </span>
              <span className={styles.value}>{adjustmentPerDay}</span>
            </div>
          </div>

          <button 
            onClick={onClose}
            className={styles.submitButton}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};