// src/apps/bossbitch/components/Auth/index.tsx
import AuthModal from './AuthModal';

export { AuthModal };

// Add a button component for triggering auth
import React from 'react';
import { useData } from '../../contexts/DataContext';
import { LogIn, LogOut, User as UserIcon } from 'lucide-react';
import styles from './styles.module.css';

interface AuthButtonProps {
  onClick?: () => void;
  showName?: boolean;
}

export const AuthButton: React.FC<AuthButtonProps> = ({ onClick, showName = false }) => {
  const { isAuthenticated, currentUser, signOut } = useData();

  const handleClick = () => {
    if (isAuthenticated) {
      signOut();
    } else if (onClick) {
      onClick();
    }
  };

  return (
    <button 
      onClick={handleClick} 
      className={styles.authButton}
      aria-label={isAuthenticated ? 'Sign Out' : 'Sign In'}
    >
      {isAuthenticated ? (
        <>
          <div className={styles.userAvatar}>
            <UserIcon size={16} />
          </div>
          {showName && currentUser?.email && (
            <span className={styles.userName}>
              {currentUser.email.split('@')[0]}
            </span>
          )}
          <LogOut size={16} className={styles.authIcon} />
        </>
      ) : (
        <>
          <LogIn size={16} className={styles.authIcon} />
          {showName && <span>Sign In</span>}
        </>
      )}
    </button>
  );
};