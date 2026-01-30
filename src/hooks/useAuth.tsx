
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/dbService';
import { Session, User } from '@supabase/supabase-js';

const OFFLINE_MODE = (import.meta as any).env?.VITE_OFFLINE_MODE === 'true';
const BACKEND = ((import.meta as any).env?.VITE_BACKEND as string) || 'supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, pass: string, name: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check active session
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
        }
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      } catch (err) {
        console.error('Error in auth initialization:', err);
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    setError(null);
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    setIsLoading(false);
    if (error) {
      setError(error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  };

  const signup = async (email: string, pass: string, name: string) => {
    setError(null);
    setIsLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: { data: { full_name: name } }
    });
    setIsLoading(false);
    if (error) {
      setError(error.message);
      return { success: false, error: error.message };
    }
    // Auto login might happen or require email confirmation depending on Supabase settings
    return { success: true };
  };

  const loginWithGoogle = async () => {
    setError(null);
    if (OFFLINE_MODE || BACKEND === 'firebase') {
      setError('Login amb Google desactivat temporalment. Fes servir email/contrasenya.');
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) setError(error.message);
  };

  const logout = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider value={{
      user, 
      session, 
      isLoading,
      isAuthenticated: !!user,
      login, 
      signup, 
      loginWithGoogle, 
      logout, 
      error 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider. Wrap your App in AuthProvider.');
  }
  return context;
};
