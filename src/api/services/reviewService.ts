
import { apiClient } from '../client';
import { Review } from '@/lib/database.types';

export interface ReviewFilters {
  userId?: string;
  restaurantId?: string;
  courierId?: string;
}

export const reviewApi = {
  getReviewsByFilters: async (filters: ReviewFilters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.restaurantId) params.append('restaurantId', filters.restaurantId);
      if (filters.courierId) params.append('courierId', filters.courierId);
      
      console.log(`Fetching reviews with filters: ${params.toString()}`);
      const response = await apiClient.get(`/reviews?${params.toString()}`);
      console.log(`Retrieved ${response.data?.length || 0} reviews`);
      return response.data;
    } catch (error) {
      console.error('Error fetching reviews by filters:', error);
      throw error;
    }
  },

  getReviewById: async (id: string) => {
    try {
      const response = await apiClient.get(`/reviews/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching review with ID ${id}:`, error);
      throw error;
    }
  },

  createReview: async (reviewData: Omit<Review, 'id' | 'created_at'>) => {
    try {
      console.log('Creating new review with data:', reviewData);
      const response = await apiClient.post('/reviews', reviewData);
      return response.data;
    } catch (error) {
      console.error('Error creating review:', error);
      throw error;
    }
  },

  updateReview: async (id: string, reviewData: Partial<Review>) => {
    try {
      const response = await apiClient.put(`/reviews/${id}`, reviewData);
      return response.data;
    } catch (error) {
      console.error(`Error updating review ${id}:`, error);
      throw error;
    }
  },

  deleteReview: async (id: string) => {
    try {
      const response = await apiClient.delete(`/reviews/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting review ${id}:`, error);
      throw error;
    }
  },

  checkExistingReview: async (userId: string, restaurantId?: string, courierId?: string) => {
    try {
      const params = new URLSearchParams();
      params.append('userId', userId);
      if (restaurantId) params.append('restaurantId', restaurantId);
      if (courierId) params.append('courierId', courierId);
      
      const response = await apiClient.get(`/reviews/check?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error checking existing review:', error);
      return { exists: false, existingId: null };
    }
  },
  
  getAverageRating: async (filters: { restaurantId?: string; courierId?: string }) => {
    try {
      const params = new URLSearchParams();
      if (filters.restaurantId) params.append('restaurantId', filters.restaurantId);
      if (filters.courierId) params.append('courierId', filters.courierId);
      
      const response = await apiClient.get(`/reviews/average?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching average rating:', error);
      return { average: 0, count: 0 };
    }
  }
};
