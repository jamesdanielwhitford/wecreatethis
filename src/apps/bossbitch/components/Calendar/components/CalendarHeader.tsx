// src/apps/bossbitch/components/Calendar/components/CalendarHeader.tsx
import React from 'react';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon } from 'lucide-react';
import styles from '../styles.module.css';

interface CalendarHeaderProps {
  headerText: string;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onToggleView: () => void;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  headerText,
  onClose,
  onPrevious,
  onNext,
  onToggleView
}) => (
  <div className={styles.header}>
    <button
      onClick={onClose}
      className={styles.iconButton}
      aria-label="Close"
    >
      <X size={24} />
    </button>
    
    <div className={styles.navigationContainer}>
      <button
        onClick={onPrevious}
        className={styles.iconButton}
        aria-label="Previous"
      >
        <ChevronLeft size={24} />
      </button>
      
      <h2 className={styles.headerTitle}>
        {headerText}
      </h2>
      
      <button
        onClick={onNext}
        className={styles.iconButton}
        aria-label="Next"
      >
        <ChevronRight size={24} />
      </button>
    </div>

    <button
      onClick={onToggleView}
      className={styles.iconButton}
      aria-label="Toggle Calendar View"
    >
      <CalendarIcon size={24} />
    </button>
  </div>
);

export default CalendarHeader;