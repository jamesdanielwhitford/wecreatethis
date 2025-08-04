import { useState, useEffect, useCallback } from 'react';
import { authService, isSupabaseConfigured } from '../utils/supabase';

interface User {
  id: string;
  email?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    // Get initial user
    authService.getCurrentUser().then(user => {
      setUser(user ? { id: user.id, email: user.email } : null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser({ id: session.user.id, email: session.user.email });
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [configured]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!configured) {
      setError('Supabase not configured');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await authService.signIn(email, password);
      
      if (error) {
        setError(error.message);
        return false;
      }

      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email });
        return true;
      }

      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, [configured]);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!configured) {
      setError('Supabase not configured');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await authService.signUp(email, password);
      
      if (error) {
        setError(error.message);
        return false;
      }

      // Note: User won't be signed in until they confirm email
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, [configured]);

  const signOut = useCallback(async () => {
    if (!configured) return;

    setLoading(true);
    
    try {
      await authService.signOut();
      setUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign out failed');
    } finally {
      setLoading(false);
    }
  }, [configured]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isConfigured: configured,
    signIn,
    signUp,
    signOut,
    clearError
  };
}