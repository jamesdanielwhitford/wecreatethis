// src/apps/bossbitch/components/Calendar/components/DetailsSection.tsx
import React from 'react';
import { formatZAR } from '../../../utils/currency';
import { IncomeSource } from '../../../types/goal.types';
import { IncomeSourcesList } from './IncomeSourcesList';
import { ActionButtons } from './ActionButtons';
import styles from '../styles.module.css';

interface DetailsSectionProps {
  type: 'daily' | 'monthly';
  displayValue: {
    progress: number;
    segments: IncomeSource[];
  };
  maxValue: number;
  percentage: number;
  onAddClick: () => void;
  onEditClick: () => void;
}

export const DetailsSection: React.FC<DetailsSectionProps> = ({
  type,
  displayValue,
  maxValue,
  percentage,
  onAddClick,
  onEditClick
}) => (
  <div className={styles.detailsContainer}>
    <div className={styles.detailsHeader}>
      <h4 className={styles.detailsTitle}>
        {type === 'daily' ? 'Daily Goal' : 'Monthly Goal'}
      </h4>
      <span className={styles.detailsValue}>
        {formatZAR(maxValue)}
      </span>
    </div>
    
    <div className={styles.progressBar}>
      <div
        className={styles.progressFill}
        style={{ width: `${percentage}%` }}
      />
    </div>
    
    <IncomeSourcesList segments={displayValue.segments} />
    
    {type === 'daily' && (
      <ActionButtons
        onAddClick={onAddClick}
        onEditClick={onEditClick}
        disabled={!displayValue.segments || displayValue.segments.length === 0}
      />
    )}
  </div>
);