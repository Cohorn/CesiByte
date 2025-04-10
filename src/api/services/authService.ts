
import { apiClient } from '../client';
import { User, UserType, EmployeeRoleType } from '@/lib/database.types';
import { generateReferralCode } from '@/utils/referralUtils';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  user_type: UserType;
  employee_role?: EmployeeRoleType;
  referral_code?: string;
}

export const authApi = {
  getCurrentUser: async () => {
    try {
      console.log('Fetching current user profile');
      const response = await apiClient.get('/auth/me');
      console.log('Current user profile fetched successfully');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch current user profile', error);
      throw error;
    }
  },

  login: async (credentials: LoginCredentials) => {
    try {
      console.log('Attempting to login with email:', credentials.email);
      const response = await apiClient.post('/auth/login', credentials);
      console.log('Login successful, response:', response.data);
      
      if (response.data.token) {
        console.log('Storing auth token in localStorage');
        // Store the token with the correct key name
        localStorage.setItem('auth_token', response.data.token);
      } else {
        console.warn('No token received in login response');
      }
      
      return response.data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  register: async (data: RegisterData) => {
    try {
      // For employee registration, set employee_role if not provided
      const registrationData = { ...data };
      
      if (registrationData.user_type === 'employee') {
        // Ensure employee_role is set to a valid value
        if (!registrationData.employee_role || 
            !['commercial_service', 'developer', 'commercial_agent'].includes(registrationData.employee_role as string)) {
          registrationData.employee_role = 'commercial_service';
        }
        // Map 'commercial_agent' to 'commercial_service' if needed
        if (registrationData.employee_role === 'commercial_agent' as any) {
          registrationData.employee_role = 'commercial_service';
        }
        console.log(`Employee registration with role: ${registrationData.employee_role}`);
      }
      
      console.log('Attempting to register new user with email:', registrationData.email);
      console.log('Registration data:', JSON.stringify(registrationData)); // Log the full registration data
      
      const response = await apiClient.post('/auth/register', registrationData);
      console.log('Registration successful, response:', response.data);
      
      if (response.data.token) {
        console.log('Storing auth token in localStorage');
        // Store the token with the correct key name
        localStorage.setItem('auth_token', response.data.token);
      } else {
        console.warn('No token received in registration response');
      }
      
      return response.data;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      console.log('Logging out user');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_email');
      localStorage.removeItem('auth_password');
      return await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout failed:', error);
      // Still remove token even if logout request fails
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_email');
      localStorage.removeItem('auth_password');
      throw error;
    }
  },

  updateProfile: async (userId: string, updates: Partial<User>) => {
    try {
      console.log('Updating user profile with ID:', userId);
      
      // Generate referral code if not present
      if (!updates.referral_code && updates.name) {
        updates.referral_code = generateReferralCode(userId, updates.name);
      }
      
      const response = await apiClient.put(`/auth/profile/${userId}`, updates);
      console.log('Profile update successful');
      return response.data;
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  },

  setUserType: async (type: UserType) => {
    try {
      console.log('Setting user type to:', type);
      const response = await apiClient.put('/auth/user-type', { user_type: type });
      console.log('User type update successful');
      return response.data;
    } catch (error) {
      console.error('User type update failed:', error);
      throw error;
    }
  },

  // Updated deleteUser method with better error handling
  deleteUser: async (userId: string) => {
    try {
      console.log('Deleting user account from auth service with ID:', userId);
      
      // Check if we have a token first
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.warn('No auth token found when attempting to delete user');
      }
      
      const response = await apiClient.delete(`/auth/user/${userId}`);
      console.log('Auth user deletion successful');
      
      // Clear auth data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_email');
      localStorage.removeItem('auth_password');
      
      return response.data;
    } catch (error: any) {
      console.error('User deletion failed in auth service:', error);
      
      // Enhanced error logging
      if (error.response) {
        console.error(`Server responded with error ${error.response.status}:`, error.response.data);
        
        // If user doesn't exist or is already deleted, consider it a success
        if (error.response.status === 404) {
          console.log('User not found in auth system - may already be deleted');
          return { success: true, message: 'User not found or already deleted' };
        }
      }
      
      throw error;
    }
  }
};
