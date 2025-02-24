// src/apps/bossbitch/components/Calendar/components/SelectedDateView.tsx
import React from 'react';
import ProgressRing from '../../ProgressRing/index';
import { formatZAR } from '../../../utils/currency';
import { IncomeSource } from '../../../types/goal.types';
import { DetailsSection } from './DetailsSection';
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

  const hasData = Boolean(displayValue?.progress);

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
          emptyRing={!hasData}
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