// src/apps/bossbitch/components/Auth/AuthModal.tsx
import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { X } from 'lucide-react';
import styles from './styles.module.css';

type AuthMode = 'signin' | 'signup';

interface AuthModalProps {
  onClose: () => void;
}

// Firebase Auth Error type
interface FirebaseAuthError extends Error {
  code: string;
  message: string;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const { signIn, signUp, migrateLocalToFirebase, isLoading } = useData();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mode, setMode] = useState<AuthMode>('signin');
  const [error, setError] = useState('');
  const [migrationSuccess, setMigrationSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (mode === 'signup') {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }

        await signUp(email, password);
        
        // Try to migrate local data to Firebase after successful signup
        const migrated = await migrateLocalToFirebase();
        setMigrationSuccess(migrated);
      } else {
        await signIn(email, password);
      }

      // Close modal on success
      onClose();
    } catch (error) {
      console.error('Authentication error:', error);
      setError(getAuthErrorMessage(error as FirebaseAuthError));
    }
  };

  const getAuthErrorMessage = (error: FirebaseAuthError): string => {
    const errorCode = error?.code || 'unknown';
    
    switch (errorCode) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'Invalid email or password';
      case 'auth/email-already-in-use':
        return 'Email is already in use';
      case 'auth/weak-password':
        return 'Password is too weak';
      case 'auth/invalid-email':
        return 'Invalid email address';
      default:
        return 'An error occurred during authentication';
    }
  };

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setError('');
  };

  return (
    <div className={styles.modal}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </h2>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={24} />
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="email@example.com"
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="••••••••"
              required
            />
          </div>

          {mode === 'signup' && (
            <div className={styles.inputGroup}>
              <label className={styles.label}>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={styles.input}
                placeholder="••••••••"
                required
              />
            </div>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submitButton} disabled={isLoading}>
            {isLoading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>

          <div className={styles.toggleMode}>
            {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
            <button
              type="button"
              onClick={toggleMode}
              className={styles.toggleButton}
              disabled={isLoading}
            >
              {mode === 'signin' ? 'Sign Up' : 'Sign In'}
            </button>
          </div>

          {migrationSuccess && (
            <p className={styles.success}>
              Your local data has been successfully migrated to your account!
            </p>
          )}

          {mode === 'signin' && (
            <p className={styles.note}>
              By signing in, your goals and progress data will be saved to your account
              and synchronized across devices.
            </p>
          )}

          {mode === 'signup' && (
            <p className={styles.note}>
              Create an account to save your goals and progress data and access
              them from any device.
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default AuthModal;