import { useState, useEffect, useCallback } from 'react';
import { authApi } from '@/api/services/authService';
import { User, UserType } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';
import { userApi } from '@/api/services/userService';
import { supabase } from '@/lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      setAuthError(null);
      
      try {
        const token = localStorage.getItem('auth_token');
        
        if (token) {
          try {
            console.log("Auth token found, fetching user profile");
            const userData = await authApi.getCurrentUser();
            setUser(userData);
            console.log("User profile fetched successfully", userData);
          } catch (error: any) {
            console.error("Failed to fetch user profile:", error);
            
            if (error.response && error.response.status === 404) {
              console.log("User profile not found, but token exists. Attempting to continue...");
              try {
                const storedEmail = localStorage.getItem('auth_email');
                const storedPassword = localStorage.getItem('auth_password');
                
                if (storedEmail && storedPassword) {
                  console.log("Stored credentials found, attempting to re-authenticate");
                  const { error } = await signIn(storedEmail, storedPassword);
                  if (error) {
                    localStorage.removeItem('auth_token');
                    setUser(null);
                  }
                } else {
                  localStorage.removeItem('auth_token');
                  setUser(null);
                }
              } catch (retryError) {
                console.error("Failed to recover session:", retryError);
                localStorage.removeItem('auth_token');
                setUser(null);
              }
            } else {
              localStorage.removeItem('auth_token');
              setUser(null);
            }
            
            setAuthError(error);
          }
        } else {
          console.log("No auth token found");
          setUser(null);
        }
      } catch (error: any) {
        console.error("Auth initialization error:", error);
        setUser(null);
        setAuthError(error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    setAuthError(null);
    
    try {
      console.log("Attempting sign in with email:", email);
      const response = await authApi.login({ email, password });
      console.log("Sign in successful", response);
      setUser(response.user);
      
      localStorage.setItem('auth_email', email);
      localStorage.setItem('auth_password', password);
      
      return { error: null };
    } catch (error: any) {
      console.error("Sign in error:", error);
      setAuthError(error);
      
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, userData: Partial<User>) => {
    setIsLoading(true);
    setAuthError(null);
    
    try {
      console.log("Attempting signup with data:", { email, userData });
      
      const registerData = {
        email,
        password,
        name: userData.name || '',
        user_type: userData.user_type || 'customer' as UserType,
        address: userData.address || '',
        lat: userData.lat || 0,
        lng: userData.lng || 0,
        referral_code: userData.referral_code
      };
      
      console.log("Sending registration data:", registerData);
      
      try {
        const response = await authApi.register(registerData);
        setUser(response.user);
        
        localStorage.setItem('auth_email', email);
        localStorage.setItem('auth_password', password);
        
        return { error: null };
      } catch (apiError: any) {
        // If the error is related to invalid user type, we'll try a workaround
        if (apiError.response?.data?.message?.includes('Invalid user_type') || 
            apiError.response?.status === 400) {
          
          console.log("Registration through API failed, attempting Supabase direct signup");
          
          // Create user with supabase directly
          const { data, error: supabaseError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                name: registerData.name,
                user_type: registerData.user_type,
                address: registerData.address,
                lat: registerData.lat,
                lng: registerData.lng,
                referral_code: registerData.referral_code
              }
            }
          });
          
          if (supabaseError) throw supabaseError;
          
          if (data?.user) {
            // Manually create the user object since we bypassed the API
            const newUser: User = {
              id: data.user.id,
              email: data.user.email || email,
              name: registerData.name,
              user_type: registerData.user_type as UserType,
              address: registerData.address,
              lat: registerData.lat,
              lng: registerData.lng,
              created_at: new Date().toISOString(),
              referral_code: registerData.referral_code
            };
            
            setUser(newUser);
            
            localStorage.setItem('auth_email', email);
            localStorage.setItem('auth_password', password);
            
            return { error: null };
          } else {
            throw new Error("Failed to create user via Supabase direct method");
          }
        } else {
          throw apiError;
        }
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      setAuthError(error);
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_email');
      localStorage.removeItem('auth_password');
      
      try {
        await authApi.logout();
      } catch (error) {
        console.error("Logout API call failed, but continuing logout process:", error);
      }
      
      setUser(null);
      
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
      
      window.location.href = '/';
    } catch (error: any) {
      console.error("Error during sign out:", error);
      toast({
        title: "Sign Out Error",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const updatedUser = await userApi.updateUser(user.id, updates);
      setUser({ ...user, ...updatedUser });
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
      });

      return updatedUser;
    } catch (error: any) {
      toast({
        title: "Update Error",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  const setUserType = async (type: UserType) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      await authApi.setUserType(type);
      setUser({ ...user, user_type: type });
      
      toast({
        title: "User Type Updated",
        description: `You are now registered as a ${type}`,
      });
    } catch (error: any) {
      toast({
        title: "Update Error",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const deleteAccount = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      await userApi.deleteUser(user.id);
      
      localStorage.removeItem('auth_token');
      setUser(null);
      
      toast({
        title: "Account Deleted",
        description: "Your account has been successfully deleted",
      });
      
      window.location.href = '/';
    } catch (error: any) {
      toast({
        title: "Delete Error",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  return {
    user,
    isLoading,
    authError,
    signIn,
    signUp,
    signOut,
    updateProfile,
    setUserType,
    deleteAccount,
    clearAuthError,
  };
}
