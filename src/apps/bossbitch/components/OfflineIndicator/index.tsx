import React from 'react';
import { useData } from '../../contexts/DataContext';
import { WifiOff } from 'lucide-react';
import styles from './styles.module.css';

const OfflineIndicator: React.FC = () => {
  const { isOnline } = useData();
  
  if (isOnline) return null;
  
  return (
    <div className={styles.container}>
      <WifiOff size={18} />
      <span>You&apos;re offline. Changes will sync when you&apos;re back online.</span>
    </div>
  );
};

export default OfflineIndicator;