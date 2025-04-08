
import { apiClient } from '../client';
import { Review } from '@/lib/database.types';

export interface ReviewFilters {
  userId?: string;
  restaurantId?: string;
  courierId?: string;
}

// Cache for review data to reduce API calls
const reviewCache = new Map<string, {
  data: any;
  timestamp: number;
}>();

// Function to generate cache key from filters
const getCacheKey = (filters: ReviewFilters = {}): string => {
  return `reviews:${filters.userId || ''}:${filters.restaurantId || ''}:${filters.courierId || ''}`;
};

// Cache expiration time (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

export const reviewApi = {
  getReviewsByFilters: async (filters: ReviewFilters = {}) => {
    try {
      const cacheKey = getCacheKey(filters);
      const cachedData = reviewCache.get(cacheKey);
      
      // Return cached data if it's fresh
      if (cachedData && (Date.now() - cachedData.timestamp < CACHE_EXPIRATION)) {
        console.log(`Using cached reviews for filters: ${JSON.stringify(filters)}`);
        return cachedData.data;
      }
      
      const params = new URLSearchParams();
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.restaurantId) params.append('restaurantId', filters.restaurantId);
      if (filters.courierId) params.append('courierId', filters.courierId);
      
      console.log(`Fetching reviews with filters: ${params.toString()}`);
      
      // Important fix: Use the correct path for the reviews endpoint
      const response = await apiClient.get(`/reviews?${params.toString()}`);
      console.log(`Retrieved ${response.data?.length || 0} reviews`);
      
      // Cache the response
      reviewCache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching reviews by filters:', error);
      throw error;
    }
  },

  getReviewById: async (id: string) => {
    try {
      console.log(`Fetching review with ID: ${id}`);
      // Fix: Use the correct path
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
      // Fix: Use the correct path
      const response = await apiClient.post('/reviews', reviewData);
      
      // Clear cache for related filters
      reviewApi.clearCache({
        userId: reviewData.user_id,
        restaurantId: reviewData.restaurant_id,
        courierId: reviewData.courier_id
      });
      
      return response.data;
    } catch (error) {
      console.error('Error creating review:', error);
      throw error;
    }
  },

  updateReview: async (id: string, reviewData: Partial<Review>) => {
    try {
      console.log('Updating review with id:', id, 'and data:', reviewData);
      // Fix: Use the correct path
      const response = await apiClient.put(`/reviews/${id}`, reviewData);
      
      // Invalidate all cache since we don't know which filters this affects
      reviewApi.clearCache();
      
      return response.data;
    } catch (error) {
      console.error(`Error updating review ${id}:`, error);
      throw error;
    }
  },

  deleteReview: async (id: string) => {
    try {
      console.log(`Deleting review with ID: ${id}`);
      // Fix: Use the correct path
      const response = await apiClient.delete(`/reviews/${id}`);
      
      // Invalidate all cache since we don't know which filters this affects
      reviewApi.clearCache();
      
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
      
      console.log(`Checking existing review with params: ${params.toString()}`);
      // Fix: Use the correct path
      const response = await apiClient.get(`/reviews/check?${params.toString()}`);
      console.log(`Check existing review response:`, response.data);
      return response.data;
    } catch (error) {
      console.error('Error checking existing review:', error);
      // Return a default response instead of throwing to avoid breaking the UI
      return { exists: false, existingId: null };
    }
  },
  
  getAverageRating: async (filters: { restaurantId?: string; courierId?: string }) => {
    try {
      const params = new URLSearchParams();
      if (filters.restaurantId) params.append('restaurantId', filters.restaurantId);
      if (filters.courierId) params.append('courierId', filters.courierId);
      
      console.log(`Fetching average rating with params: ${params.toString()}`);
      // Fix: Use the correct path
      const response = await apiClient.get(`/reviews/average?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching average rating:', error);
      return { average: 0, count: 0 };
    }
  },
  
  // Clear cache for specific filters or all cache if no filters provided
  clearCache: (filters?: ReviewFilters) => {
    if (filters) {
      const cacheKey = getCacheKey(filters);
      reviewCache.delete(cacheKey);
    } else {
      reviewCache.clear();
    }
  }
};
