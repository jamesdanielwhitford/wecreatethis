// src/apps/bossbitch/components/Calendar/components/ActionButtons.tsx
import React from 'react';
import { Plus, Edit } from 'lucide-react';
import styles from '../styles.module.css';

interface ActionButtonsProps {
  onAddClick: () => void;
  onEditClick: () => void;
  disabled: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({ 
  onAddClick, 
  onEditClick, 
  disabled 
}) => (
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