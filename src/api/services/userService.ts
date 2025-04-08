
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
      const response = await apiClient.delete(`/users/${id}`);
      // Clear any stored auth tokens upon successful deletion
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_email');
      localStorage.removeItem('auth_password');
      return response.data;
    } catch (error) {
      console.error("Failed to delete user:", error);
      throw error;
    }
  }
};
