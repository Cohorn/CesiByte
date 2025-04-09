
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/api/services/authService';
import { User, UserType, EmployeeRoleType } from '@/lib/database.types';
import { isValidUserType } from '@/utils/userRegistrationFix';

// Simple cookie functions since cookies-next is not available
const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};

const setCookie = (name: string, value: string, options: { maxAge?: number } = {}): void => {
  let cookieString = `${name}=${value}`;
  if (options.maxAge) {
    cookieString += `; max-age=${options.maxAge}`;
  }
  cookieString += '; path=/';
  document.cookie = cookieString;
};

const deleteCookie = (name: string): void => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

interface AuthContextProps {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success?: boolean, error?: any }>;
  signOut: () => void;
  register: (userData: any) => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  isLoading: boolean;
  deleteAccount?: () => Promise<void>;
  // Add the updateProfile function to match what's used in the components
  updateProfile: (userData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUserFromCookie = async () => {
      const token = getCookie('auth_token');
      if (token) {
        try {
          const user = await authApi.getCurrentUser();
          setUser(user);
        } catch (error) {
          console.error('Failed to fetch user from token:', error);
          deleteCookie('auth_token');
          setUser(null);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    loadUserFromCookie();
  }, []);

  const signIn = async (email: string, password: string): Promise<{ success?: boolean, error?: any }> => {
    setLoading(true);
    try {
      const { token } = await authApi.login({ email, password });
      setCookie('auth_token', token, { maxAge: 60 * 60 * 24 * 7 }); // expires in 7 days
      const user = await authApi.getCurrentUser();
      setUser(user);
      
      // Redirect based on user type
      if (user.user_type === 'employee') {
        navigate('/employee/dashboard');
      } else {
        navigate('/');
      }
      return { success: true };
    } catch (error: any) {
      console.error('Login failed:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: any) => {
    setLoading(true);
    try {
      // Validate user_type before registration
      if (!userData.user_type || !await isValidUserType(userData.user_type)) {
        throw new Error("Invalid user type");
      }

      await authApi.register(userData);
      await signIn(userData.email, userData.password); // Auto sign-in after successful registration
      navigate('/');
    } catch (error: any) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    deleteCookie('auth_token');
    setUser(null);
    navigate('/login');
  };

  const updateUser = async (userData: Partial<User>) => {
    try {
      if (!user) {
        throw new Error("No user is currently authenticated");
      }
      const updatedUser = await authApi.updateProfile(user.id, userData);
      setUser(updatedUser);
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  };
  
  // Add updateProfile as an alias for updateUser to match what the components are using
  const updateProfile = updateUser;
  
  const deleteAccount = async () => {
    try {
      // Implement account deletion logic using the authApi
      // This is a placeholder - we would need to add a deleteUser method to authApi
      signOut();
    } catch (error) {
      console.error('Failed to delete account:', error);
      throw error;
    }
  };
  
  const value = { 
    user, 
    loading, 
    signIn, 
    signOut, 
    register, 
    updateUser,
    updateProfile, // Add this to the context value
    isLoading: loading,
    deleteAccount
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const isEmployeeType = (user: any): boolean => {
  return user && user.user_type === 'employee';
};

export const isDeveloper = (user: any): boolean => {
  return isEmployeeType(user) && user.employee_role === 'developer';
};

export const isCommercialAgent = (user: any): boolean => {
  return isEmployeeType(user) && user.employee_role === 'commercial_agent';
};
