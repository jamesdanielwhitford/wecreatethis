'use client';

// src/apps/bossbitch/components/AddGoalModal/index.tsx
import React, { useState, useEffect } from 'react';
import { X, Plus, Check } from 'lucide-react';
import { IncomeSource } from '../../types/goal.types';
import { formatZAR, parseZAR } from '../../utils/currency';
import { useData } from '../../contexts/DataContext';
import LoadingIndicator from '../LoadingIndicator';
import styles from './styles.module.css';

interface AddGoalModalProps {
  onClose: () => void;
  onAdd: (amount: number, source: IncomeSource) => void;
  currentValue: number;
  maxValue: number;
  existingSources: IncomeSource[];
}

const AddGoalModal: React.FC<AddGoalModalProps> = ({
  onClose,
  onAdd,
  currentValue,
  maxValue,
  existingSources,
}) => {
  const { incomeSources, isLoading } = useData();
  const [amount, setAmount] = useState('');
  const [selectedSource, setSelectedSource] = useState<IncomeSource | null>(null);
  const [newSourceName, setNewSourceName] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [error, setError] = useState('');
  const [availableSources, setAvailableSources] = useState<IncomeSource[]>([]);

  // Format amount as currency while typing
  const handleAmountChange = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    
    if (cleaned === '') {
      setAmount('');
      return;
    }

    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    
    try {
      const number = parseFloat(cleaned);
      if (!isNaN(number)) {
        setAmount(formatZAR(number));
      }
    } catch (e) {
      setAmount(cleaned);
    }
  };

  // Load available income sources
  useEffect(() => {
    // Use both income sources from the data service and local existing sources
    const combinedSources = [...incomeSources];
    
    // Add existing sources that might not be in the global sources yet
    existingSources.forEach(source => {
      if (!combinedSources.some(s => s.id === source.id)) {
        combinedSources.push(source);
      }
    });
    
    setAvailableSources(combinedSources);
  }, [incomeSources, existingSources]);

  // Generate a random color for new sources
  const generateColor = () => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFD700', '#FFA500', '#FF8C00', '#7C3AED', '#10B981'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const handleSubmit = () => {
    const parsedAmount = parseZAR(amount);
    
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!selectedSource && !newSourceName) {
      setError('Please select or create an income source');
      return;
    }

    const sourceToUse = selectedSource || {
      id: Date.now().toString(),
      name: newSourceName,
      value: parsedAmount,
      color: generateColor(),
    };

    onAdd(parsedAmount, sourceToUse);
  };

  const willExceedGoal = () => {
    const parsedAmount = parseZAR(amount);
    return !isNaN(parsedAmount) && (currentValue + parsedAmount) >= maxValue;
  };

  return (
    <div className={styles.modal}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Add Income</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Amount Input */}
        <div className={styles.inputGroup}>
          <label className={styles.label}>Amount</label>
          <input
            type="text"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="R 0.00"
            className={styles.input}
          />
        </div>

        {/* Source Selection */}
        {!isAddingNew && (
          <div className={styles.inputGroup}>
            <label className={styles.label}>Income Source</label>
            <div className={styles.sourceList}>
              {availableSources.map(source => (
                <button
                  key={source.id}
                  onClick={() => setSelectedSource(source)}
                  className={`${styles.sourceButton} ${selectedSource?.id === source.id ? styles.selected : ''}`}
                >
                  <div className={styles.sourceInfo}>
                    <div 
                      className={styles.sourceColor}
                      style={{ backgroundColor: source.color }}
                    />
                    <span>{source.name}</span>
                  </div>
                  {selectedSource?.id === source.id && (
                    <Check className="w-5 h-5" />
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setIsAddingNew(true);
                setSelectedSource(null);
              }}
              className={styles.addNewButton}
            >
              <Plus className="w-5 h-5" />
              Add New Source
            </button>
          </div>
        )}

        {/* New Source Input */}
        {isAddingNew && (
          <div className={styles.inputGroup}>
            <label className={styles.label}>New Source Name</label>
            <input
              type="text"
              value={newSourceName}
              onChange={(e) => setNewSourceName(e.target.value)}
              placeholder="Enter source name"
              className={styles.input}
            />
            <button
              onClick={() => {
                setIsAddingNew(false);
                setNewSourceName('');
              }}
              className={styles.backButton}
            >
              ← Back to existing sources
            </button>
          </div>
        )}

        {error && (
          <p className={styles.error}>{error}</p>
        )}

        {/* Goal Progress Preview */}
        {amount && !isNaN(parseZAR(amount)) && (
          <div className={styles.preview}>
            <p className={styles.previewLabel}>After this addition:</p>
            <p className={styles.previewValue}>
              {formatZAR(currentValue + parseZAR(amount))} / {formatZAR(maxValue)}
            </p>
            {willExceedGoal() && (
              <p className={styles.goalSuccess}>
                🎉 This will meet your goal!
              </p>
            )}
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          className={styles.submitButton}
          disabled={isLoading || !amount || (!selectedSource && !newSourceName)}
        >
          {isLoading ? 'Adding...' : 'Add Income'}
        </button>
      </div>
      
      {/* Loading Indicator */}
      {isLoading && <LoadingIndicator fullScreen size="small" text="Adding income..." />}
    </div>
  );
};

export default AddGoalModal;