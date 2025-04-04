
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth as useAuthHook } from '@/frontend/hooks/useAuth';
import { User, UserType } from './database.types';

interface AuthContextState {
  user: User | null;
  isLoading: boolean;
  authError: Error | null;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, userData: Partial<User>) => Promise<any>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  setUserType: (type: UserType) => Promise<void>;
  deleteAccount: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuthHook();
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Mark auth as initialized after initial check
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  const clearAuthError = () => {
    if (auth.clearAuthError) {
      auth.clearAuthError();
    }
  };
  
  // Create a memoized value for the context to avoid unnecessary re-renders
  const contextValue = {
    user: auth.user,
    isLoading: auth.isLoading && !isInitialized,
    authError: auth.authError,
    signIn: auth.signIn,
    signUp: auth.signUp,
    signOut: auth.signOut,
    updateProfile: auth.updateProfile,
    setUserType: auth.setUserType,
    deleteAccount: auth.deleteAccount,
    clearAuthError,
  };
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
