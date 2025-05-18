/**
 * File: src/apps/beautifulmind/components/Login/index.tsx
 * Login component for Beautiful Mind app
 */

'use client';

import React, { useState } from 'react';
import styles from './styles.module.css';
import { useAuthContext } from '../AuthProvider';

type AuthMode = 'signin' | 'signup';

interface LoginProps {
  onAuthenticated?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { signIn, signUp, error, clearError } = useAuthContext();
  
  const toggleMode = () => {
    clearError();
    setMode(mode === 'signin' ? 'signup' : 'signin');
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        await signUp(email, password, displayName);
      }
      
      // Call the callback if provided
      if (onAuthenticated) {
        onAuthenticated();
      }
    } catch (error) {
      console.error('Authentication error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <h2 className={styles.title}>
          {mode === 'signin' ? 'Sign In' : 'Create Account'}
        </h2>
        
        <form className={styles.form} onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className={styles.formGroup}>
              <label htmlFor="displayName" className={styles.label}>Name</label>
              <input
                id="displayName"
                type="text"
                className={styles.input}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                required
              />
            </div>
          )}
          
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>Email</label>
            <input
              id="email"
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email"
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>Password</label>
            <input
              id="password"
              type="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
              minLength={6}
            />
          </div>
          
          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}
          
          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Please wait...'
              : mode === 'signin' ? 'Sign In' : 'Create Account'
            }
          </button>
        </form>
        
        <div className={styles.toggleMode}>
          {mode === 'signin' ? (
            <>
              Don't have an account?{' '}
              <button 
                className={styles.toggleButton}
                onClick={toggleMode}
                type="button"
              >
                Sign Up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button 
                className={styles.toggleButton}
                onClick={toggleMode}
                type="button"
              >
                Sign In
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;