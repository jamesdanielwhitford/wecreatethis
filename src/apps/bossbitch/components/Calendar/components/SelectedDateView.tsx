// src/apps/bossbitch/components/Calendar/components/SelectedDateView.tsx
import React from 'react';
import { Plus, Edit } from 'lucide-react';
import ProgressRing from '../../ProgressRing';
import { formatZAR } from '../../../utils/currency';
import { IncomeSource } from '../../../types/goal.types';
import styles from '../styles.module.css';

interface SelectedDateViewProps {
  type: 'daily' | 'monthly';
  displayValue: {
    progress: number;
    segments: IncomeSource[];
  };
  maxValue: number;
  ringColor: string;
  onAddClick: () => void;
  onEditClick: () => void;
  children?: React.ReactNode;
}

const IncomeSourcesList: React.FC<{ segments: IncomeSource[] }> = ({ segments }) => {
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

const ActionButtons: React.FC<{
  onAddClick: () => void;
  onEditClick: () => void;
  disabled: boolean;
}> = ({ onAddClick, onEditClick, disabled }) => (
  <div className={styles.dayActionButtons}>
    <button 
      className={styles.dayActionButton}
      onClick={onAddClick}
    >
      <Plus size={18} />
      <span>Add Income</span>
    </button>
    
    <button 
      className={styles.dayActionButton}
      onClick={onEditClick}
      disabled={disabled}
    >
      <Edit size={18} />
      <span>Edit Income</span>
    </button>
  </div>
);

const DetailsSection: React.FC<{
  type: 'daily' | 'monthly';
  displayValue: {
    progress: number;
    segments: IncomeSource[];
  };
  maxValue: number;
  percentage: number;
  onAddClick: () => void;
  onEditClick: () => void;
}> = ({
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

const SelectedDateView: React.FC<SelectedDateViewProps> = ({
  type,
  displayValue,
  maxValue,
  ringColor,
  onAddClick,
  onEditClick,
  children
}) => {
  const calculatePercentage = () => {
    return Math.min((displayValue.progress / maxValue) * 100, 100);
  };

  return (
    <div className={styles.selectedDateView}>
      {children}
      
      <div className={styles.selectedRingContainer}>
        <ProgressRing
          progress={displayValue.progress}
          maxValue={maxValue}
          color={ringColor}
          size={240}
          strokeWidth={24}
          segments={displayValue.segments}
          animate={true}
        />
        <div className={styles.ringCenterValue}>
          {formatZAR(displayValue.progress)}
        </div>
      </div>
      
      <DetailsSection
        type={type}
        displayValue={displayValue}
        maxValue={maxValue}
        percentage={calculatePercentage()}
        onAddClick={onAddClick}
        onEditClick={onEditClick}
      />
    </div>
  );
};

export default SelectedDateView;