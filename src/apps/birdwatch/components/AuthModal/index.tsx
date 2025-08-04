import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import styles from './styles.module.css';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { signIn, signUp, loading, error, clearError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (mode === 'signup' && password !== confirmPassword) {
      return;
    }

    const success = mode === 'signin' 
      ? await signIn(email, password)
      : await signUp(email, password);

    if (success) {
      onClose();
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    }
  };

  const handleClose = () => {
    onClose();
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setMode('signin');
    clearError();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </h2>
          <button 
            onClick={handleClose} 
            className={styles.closeButton}
            disabled={loading}
          >
            ×
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.info}>
            <p>
              {mode === 'signin' 
                ? 'Sign in to sync your bird list across devices'
                : 'Create an account to save your bird list in the cloud'
              }
            </p>
            {mode === 'signup' && (
              <p className={styles.note}>
                You'll need to confirm your email address after signing up.
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={styles.input}
                disabled={loading}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className={styles.input}
                disabled={loading}
              />
            </div>

            {mode === 'signup' && (
              <div className={styles.field}>
                <label htmlFor="confirmPassword" className={styles.label}>
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className={styles.input}
                  disabled={loading}
                />
                {password !== confirmPassword && confirmPassword && (
                  <div className={styles.error}>
                    Passwords don't match
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className={styles.error}>
                {error}
              </div>
            )}

            <button 
              type="submit"
              className={styles.submitButton}
              disabled={loading || (mode === 'signup' && password !== confirmPassword)}
            >
              {loading 
                ? (mode === 'signin' ? 'Signing In...' : 'Creating Account...') 
                : (mode === 'signin' ? 'Sign In' : 'Create Account')
              }
            </button>
          </form>

          <div className={styles.switchMode}>
            {mode === 'signin' ? (
              <p>
                Don't have an account?{' '}
                <button 
                  onClick={() => setMode('signup')}
                  className={styles.linkButton}
                  disabled={loading}
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button 
                  onClick={() => setMode('signin')}
                  className={styles.linkButton}
                  disabled={loading}
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}