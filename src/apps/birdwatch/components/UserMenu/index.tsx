import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import styles from './styles.module.css';

interface UserMenuProps {
  onSignInClick: () => void;
}

export default function UserMenu({ onSignInClick }: UserMenuProps) {
  const { user, isAuthenticated, signOut, isConfigured } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
  };

  if (!isConfigured) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <button 
        onClick={onSignInClick}
        className={styles.signInButton}
      >
        Sign In
      </button>
    );
  }

  return (
    <div className={styles.container} ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={styles.userButton}
      >
        <div className={styles.avatar}>
          {user?.email ? user.email[0].toUpperCase() : 'U'}
        </div>
        <span className={styles.userName}>
          {user?.email}
        </span>
        <span className={styles.chevron}>
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {isOpen && (
        <div className={styles.menu}>
          <div className={styles.menuItem}>
            <div className={styles.userInfo}>
              <div className={styles.userEmail}>{user?.email}</div>
              <div className={styles.syncStatus}>Cloud sync enabled</div>
            </div>
          </div>
          <hr className={styles.divider} />
          <button 
            onClick={handleSignOut}
            className={styles.menuButton}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}