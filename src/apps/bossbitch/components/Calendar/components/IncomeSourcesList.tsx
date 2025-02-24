// src/apps/bossbitch/components/Calendar/components/IncomeSourcesList.tsx
import React from 'react';
import { IncomeSource } from '../../../types/goal.types';
import { formatZAR } from '../../../utils/currency';
import styles from '../styles.module.css';

interface IncomeSourcesListProps {
  segments: IncomeSource[];
}

export const IncomeSourcesList: React.FC<IncomeSourcesListProps> = ({ segments }) => {
  if (!segments || segments.length === 0) return null;

  return (
    <>
      <h5 className={styles.sourcesTitle}>Income Sources:</h5>
      <div className={styles.sourcesList}>
        {segments.map((segment) => (
          <div 
            key={segment.id}
            className={styles.sourceItem}
          >
            <div className={styles.sourceInfo}>
              <div 
                className={styles.sourceColor}
                style={{ backgroundColor: segment.color }}
              />
              <span className={styles.sourceName}>{segment.name}</span>
            </div>
            <span className={styles.sourceValue}>
              {formatZAR(segment.value)}
            </span>
          </div>
        ))}
      </div>
    </>
  );
};