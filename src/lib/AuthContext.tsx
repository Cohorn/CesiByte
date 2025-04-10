import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/api/services/authService';
import { userApi } from '@/api/services/userService';
import { User, UserType, EmployeeRoleType } from '@/lib/database.types';
import { isValidUserType } from '@/utils/userRegistrationFix';
import { useToast } from '@/hooks/use-toast';

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
  register: (userData: any) => Promise<{ success: boolean, error?: any }>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  isLoading: boolean;
  deleteAccount: () => Promise<void>;
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
  const { toast } = useToast();

  useEffect(() => {
    const loadUserFromCookie = async () => {
      const token = getCookie('auth_token') || localStorage.getItem('auth_token');
      if (token) {
        try {
          const user = await authApi.getCurrentUser();
          console.log("User loaded from cookie/token:", user);
          setUser(user);
        } catch (error) {
          console.error('Failed to fetch user from token:', error);
          deleteCookie('auth_token');
          localStorage.removeItem('auth_token');
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
      const { token, user } = await authApi.login({ email, password });
      setCookie('auth_token', token, { maxAge: 60 * 60 * 24 * 7 });
      
      console.log("User from login:", user);
      setUser(user);
      
      if (user.user_type === 'employee') {
        console.log(`Employee login successful, role: ${user.employee_role}`);
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
      if (!userData.user_type || !isValidUserType(userData.user_type)) {
        throw new Error("Invalid user type");
      }

      console.log("Registering with data:", userData);
      const response = await authApi.register(userData);
      
      if (response.token && response.user) {
        console.log("Registration successful, user:", response.user);
        setUser(response.user);
        setCookie('auth_token', response.token, { maxAge: 60 * 60 * 24 * 7 });
        
        setTimeout(() => {
          if (response.user.user_type === 'employee') {
            console.log("Employee registered, redirecting to employee dashboard");
            navigate('/employee/dashboard');
          } else if (response.user.user_type === 'restaurant') {
            console.log("Restaurant registered, redirecting to restaurant setup");
            navigate('/restaurant/setup');
          } else if (response.user.user_type === 'courier') {
            console.log("Courier registered, redirecting to courier dashboard");
            navigate('/courier/orders');
          } else {
            navigate('/');
          }
        }, 100);
        
        return { success: true };
      } else {
        console.error("Registration response missing token or user:", response);
        return { success: false, error: "Registration failed: Invalid response" };
      }
    } catch (error: any) {
      console.error('Registration failed:', error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    deleteCookie('auth_token');
    localStorage.removeItem('auth_token');
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
  
  const updateProfile = updateUser;
  
  const deleteAccount = async () => {
    try {
      if (!user) {
        throw new Error("No user is currently authenticated");
      }
      
      setLoading(true);
      
      console.log(`Deleting user account: ${user.id}`);
      
      if (user.user_type === 'restaurant') {
        try {
          console.log('Restaurant owner detected, checking for related data');
        } catch (restaurantError) {
          console.error("Error checking restaurant data:", restaurantError);
        }
      }
      
      let authDeleted = false;
      let userDeleted = false;
      
      try {
        await userApi.deleteUser(user.id);
        console.log("User profile deleted successfully");
        userDeleted = true;
      } catch (userError: any) {
        console.error("Error deleting from user service:", userError);
        
        if (userError.response && userError.response.status === 404) {
          console.log("User not found in database - continuing with auth cleanup");
          userDeleted = true;
        } else {
          toast({
            title: "Delete error",
            description: "Could not delete user profile. Please try again later.",
            variant: "destructive",
          });
          throw userError;
        }
      }
      
      try {
        await authApi.deleteUser(user.id);
        console.log("Auth user deleted successfully");
        authDeleted = true;
      } catch (authError: any) {
        console.error("Error deleting from auth service:", authError);
        
        if (authError.response && authError.response.status === 404) {
          console.log("User not found in auth - continuing with cleanup");
          authDeleted = true;
        } else if (!userDeleted) {
          toast({
            title: "Delete error",
            description: "Could not delete authentication data. Please try again later.",
            variant: "destructive",
          });
          throw authError;
        }
      }
      
      deleteCookie('auth_token');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_email');
      localStorage.removeItem('auth_password');
      
      setUser(null);
      
      if (userDeleted || authDeleted) {
        toast({
          title: "Account deleted",
          description: "Your account and associated data have been deleted.",
        });
        
        navigate('/login');
      }
    } catch (error: any) {
      console.error('Failed to delete account:', error);
      toast({
        title: "Failed to delete account",
        description: error.message || "An error occurred while deleting your account.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const value = { 
    user, 
    loading, 
    signIn, 
    signOut, 
    register, 
    updateUser,
    updateProfile,
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
  if (!user) return false;
  console.log("Checking if employee type:", user.user_type, user);
  return user && user.user_type === 'employee';
};

export const isDeveloper = (user: any): boolean => {
  if (!user) return false;
  console.log("Checking if developer:", user.employee_role, user);
  return isEmployeeType(user) && user.employee_role === 'developer';
};

export const isCommercialAgent = (user: any): boolean => {
  if (!user) return false;
  console.log("Checking if commercial agent:", user.employee_role, user);
  return isEmployeeType(user) && (user.employee_role === 'commercial_service' || user.employee_role === 'commercial_agent');
};
