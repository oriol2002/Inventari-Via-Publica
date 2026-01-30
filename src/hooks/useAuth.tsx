
import React, { createContext, useContext, useEffect, useState } from 'react';
import { firebaseAuth, googleProvider } from '../services/firebaseService';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User
} from 'firebase/auth';

const OFFLINE_MODE = (import.meta as any).env?.VITE_OFFLINE_MODE === 'true';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (fbUser) => {
      setUser(fbUser);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async (): Promise<boolean> => {
    setError(null);
    if (OFFLINE_MODE) {
      setError('Mode offline actiu. No es pot iniciar sessió.');
      return false;
    }
    try {
      await signInWithPopup(firebaseAuth, googleProvider);
      return true;
    } catch (e: any) {
      setError(e?.message || 'Error en login amb Google');
      return false;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    await signOut(firebaseAuth);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider value={{
      user, 
      isLoading,
      isAuthenticated: !!user,
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
