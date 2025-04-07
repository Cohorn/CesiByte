
import { apiClient } from '../client';
import { User, UserType } from '@/lib/database.types';

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
      // For employee registration, set dummy address, lat, lng values
      const registrationData = { ...data };
      
      if (registrationData.user_type === 'employee') {
        registrationData.address = '';
        registrationData.lat = 0;
        registrationData.lng = 0;
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
  }
};
