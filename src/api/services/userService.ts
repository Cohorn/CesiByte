
import { apiClient } from '../client';
import { UserType, SimpleUser, User } from '@/lib/database.types';

export const userApi = {
  getUserById: async (id: string) => {
    try {
      const response = await apiClient.get(`/users/${id}`);
      return response.data;
    } catch (error) {
      console.error("Failed to get user by ID:", error);
      throw error;
    }
  },
  
  getUserByEmail: async (email: string) => {
    try {
      const response = await apiClient.get(`/users/email/${email}`);
      return response.data;
    } catch (error) {
      console.error("Failed to get user by email:", error);
      throw error;
    }
  },

  getUsersByType: async (userType: UserType) => {
    try {
      const response = await apiClient.get(`/users/type/${userType}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to get users of type ${userType}:`, error);
      throw error;
    }
  },
  
  getSimpleUserById: async (id: string) => {
    try {
      const response = await apiClient.get(`/users/${id}/simple`);
      return response.data;
    } catch (error) {
      console.error("Failed to get simple user by ID:", error);
      throw error;
    }
  },

  updateUser: async (id: string, userData: Partial<User>) => {
    try {
      const response = await apiClient.put(`/users/${id}`, userData);
      return response.data;
    } catch (error) {
      console.error("Failed to update user:", error);
      throw error;
    }
  },

  updateUserLocation: async (id: string, lat: number, lng: number) => {
    try {
      const response = await apiClient.put(`/users/${id}/location`, { lat, lng });
      return response.data;
    } catch (error) {
      console.error("Failed to update user location:", error);
      throw error;
    }
  },
  
  deleteUser: async (id: string) => {
    try {
      console.log(`Attempting to delete user with ID: ${id}`);
      
      // Log the complete request details for debugging
      const url = `/users/${id}`;
      console.log(`Delete request URL: ${url}`);
      console.log(`Auth token present: ${localStorage.getItem('auth_token') ? 'Yes' : 'No'}`);
      
      // First try to clean up related data (particularly for restaurant users)
      // This can help with foreign key constraint errors
      if (localStorage.getItem('auth_token')) {
        try {
          // Get user type first to handle specific cleanup
          const userResponse = await apiClient.get(`/users/${id}`);
          const userData = userResponse.data;
          
          if (userData && userData.user_type === 'restaurant') {
            console.log('Restaurant user detected, cleaning up restaurant data first');
            // Specific cleanup for restaurant users can be added here
          }
        } catch (cleanupError) {
          console.log('Could not perform pre-deletion cleanup:', cleanupError);
          // Continue with deletion attempt even if cleanup fails
        }
      }
      
      // Proceed with user deletion
      const response = await apiClient.delete(`/users/${id}`);
      
      // Clear any stored auth tokens upon successful deletion
      console.log('User deletion successful, clearing auth tokens');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_email');
      localStorage.removeItem('auth_password');
      
      return response.data;
    } catch (error: any) {
      console.error("Failed to delete user:", error);
      
      // Enhanced error logging
      if (error.response) {
        console.error(`Server responded with error ${error.response.status}:`, error.response.data);
        
        // If we get a foreign key constraint error
        if (error.response.status === 400 && 
            error.response.data?.error?.includes('foreign key constraint')) {
          console.error('Foreign key constraint error - user has related data');
        }
      } else if (error.request) {
        console.error("No response received from server:", error.request);
      } else {
        console.error("Error setting up request:", error.message);
      }
      
      throw error;
    }
  }
};
