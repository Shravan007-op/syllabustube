import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (
    email: string,
    password: string
  ) => Promise<{ error: string | null; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function formatAuthError(error: unknown): string {
  if (!error) return 'An unexpected error occurred.';
  const message = typeof error === 'string' ? error : (error as { message?: string }).message || '';

  if (message.includes('Invalid login credentials')) {
    return 'Incorrect email or password. Please check your details and try again.';
  }
  if (message.includes('User already registered') || message.includes('already exists')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (message.includes('Password should be at least 6 characters')) {
    return 'Password is too short. Please choose a password with at least 6 characters.';
  }
  if (message.includes('Email not confirmed')) {
    return 'Your email has not been confirmed yet. Please check your inbox for the verification link.';
  }
  if (message.includes('rate limit') || message.includes('over_email_send_rate_limit')) {
    return 'Too many attempts in a short time. Please wait a minute before trying again.';
  }
  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return 'Unable to reach the authentication service. Please check your network connection.';
  }
  if (message.includes('signup disabled')) {
    return 'Signups are currently disabled in this project.';
  }
  return message || 'Authentication failed. Please try again.';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
      })
      .catch((err) => {
        console.warn('Failed to load initial Supabase session:', err);
      })
      .finally(() => {
        setLoading(false);
      });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async (): Promise<{ error: string | null }> => {
    if (!isSupabaseConfigured) {
      return { error: 'Supabase is not configured yet. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.' };
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) return { error: formatAuthError(error) };
      return { error: null };
    } catch (err) {
      return { error: formatAuthError(err) };
    }
  };

  const signInWithEmail = async (
    email: string,
    password: string
  ): Promise<{ error: string | null }> => {
    if (!isSupabaseConfigured) {
      return { error: 'Supabase is not configured yet. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.' };
    }
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) return { error: formatAuthError(error) };
      return { error: null };
    } catch (err) {
      return { error: formatAuthError(err) };
    }
  };

  const signUpWithEmail = async (
    email: string,
    password: string
  ): Promise<{ error: string | null; needsEmailConfirmation?: boolean }> => {
    if (!isSupabaseConfigured) {
      return { error: 'Supabase is not configured yet. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.' };
    }
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) return { error: formatAuthError(error) };
      const needsEmailConfirmation = Boolean(data.user && !data.session);
      return { error: null, needsEmailConfirmation };
    } catch (err) {
      return { error: formatAuthError(err) };
    }
  };

  const signOut = async (): Promise<void> => {
    if (!isSupabaseConfigured) {
      setUser(null);
      setSession(null);
      return;
    }
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Error signing out:', err);
    } finally {
      setUser(null);
      setSession(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured: isSupabaseConfigured,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
