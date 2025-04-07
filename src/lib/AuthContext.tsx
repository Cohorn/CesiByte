
import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth as useAuthHook } from '@/hooks/useAuth';
import { User, UserType } from './database.types';

// Define the context shape
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  authError: Error | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, userData: Partial<User>) => Promise<{ error: any }>;
  signOut: () => Promise<void>; // Changed from logout to signOut
  updateProfile: (updates: Partial<User>) => Promise<any>;
  setUserType: (type: UserType) => Promise<void>;
  deleteAccount: () => Promise<void>;
  clearAuthError: () => void;
}

// Create the context
const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// Create a provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const auth = useAuthHook();
  
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

// Export a custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);
