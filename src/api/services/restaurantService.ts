
import { apiClient } from '../client';
import { Restaurant, MenuItem } from '@/lib/database.types';

// Cache for restaurant data
const restaurantCache = {
  byId: new Map<string, { data: Restaurant; timestamp: number }>(),
  byUserId: new Map<string, { data: Restaurant; timestamp: number }>(),
  all: { data: Restaurant[]; timestamp: number; } | null,  // Fixed syntax by adding semicolon before the closing brace
};

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

export const restaurantApi = {
  getAllRestaurants: async (forceRefresh: boolean = false) => {
    const now = Date.now();
    
    if (!forceRefresh && restaurantCache.all && (now - restaurantCache.all.timestamp < CACHE_TTL)) {
      console.log('Using cached restaurant list data');
      return restaurantCache.all.data;
    }
    
    try {
      console.log('Fetching all restaurants from API');
      const response = await apiClient.get('/restaurants');
      
      // Update cache
      restaurantCache.all = { data: response.data, timestamp: now };
      
      return response.data;
    } catch (error) {
      console.error('Error fetching all restaurants:', error);
      throw error;
    }
  },
  
  getRestaurantById: async (id: string, forceRefresh: boolean = false) => {
    console.log(`Getting restaurant by ID: ${id}, force refresh: ${forceRefresh}`);
    const now = Date.now();
    
    if (!forceRefresh && restaurantCache.byId.has(id)) {
      const cachedData = restaurantCache.byId.get(id);
      if (cachedData && (now - cachedData.timestamp < CACHE_TTL)) {
        console.log(`Using cached restaurant data for ID: ${id}`);
        return cachedData.data;
      }
    }
    
    try {
      console.log(`Fetching restaurant with ID: ${id} from API`);
      const response = await apiClient.get(`/restaurants/${id}`);
      
      // Cache the result
      restaurantCache.byId.set(id, { data: response.data, timestamp: now });
      
      return response.data;
    } catch (error) {
      console.error(`Error fetching restaurant ID ${id}:`, error);
      // Clear cached data on error to force a fresh fetch next time
      restaurantCache.byId.delete(id);
      throw error;
    }
  },
  
  getRestaurantByUserId: async (userId: string, forceRefresh: boolean = false) => {
    console.log(`Getting restaurant by user ID: ${userId}, force refresh: ${forceRefresh}`);
    const now = Date.now();
    
    if (!forceRefresh && restaurantCache.byUserId.has(userId)) {
      const cachedData = restaurantCache.byUserId.get(userId);
      if (cachedData && (now - cachedData.timestamp < CACHE_TTL)) {
        console.log(`Using cached restaurant data for user ID: ${userId}`);
        return cachedData.data;
      }
    }
    
    try {
      console.log(`Fetching restaurant for user ID: ${userId} from API`);
      const response = await apiClient.get(`/restaurants/user/${userId}`);
      
      // Cache the result
      restaurantCache.byUserId.set(userId, { data: response.data, timestamp: now });
      
      // Also cache by restaurant ID for potential future lookups
      if (response.data && response.data.id) {
        restaurantCache.byId.set(response.data.id, { data: response.data, timestamp: now });
      }
      
      return response.data;
    } catch (error) {
      console.error(`Error fetching restaurant for user ID ${userId}:`, error);
      
      // Clear cached data on error to force a fresh fetch next time
      restaurantCache.byUserId.delete(userId);
      
      // Determine if this is a 404 (not found) error
      if (error.response && error.response.status === 404) {
        console.log(`No restaurant found for user ID: ${userId}`);
        return null; // Return null instead of throwing for 404
      }
      
      throw error;
    }
  },
  
  createRestaurant: async (data: Omit<Restaurant, 'id' | 'created_at'>) => {
    try {
      console.log('Creating restaurant with data:', data);
      const response = await apiClient.post('/restaurants', data);
      
      // Invalidate relevant caches
      restaurantCache.all = null;
      if (data.user_id) {
        restaurantCache.byUserId.delete(data.user_id);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error creating restaurant:', error);
      throw error;
    }
  },
  
  updateRestaurant: async (id: string, data: Partial<Restaurant>) => {
    try {
      console.log(`Updating restaurant ${id} with data:`, data);
      const response = await apiClient.put(`/restaurants/${id}`, data);
      
      // Invalidate relevant caches
      restaurantCache.all = null;
      restaurantCache.byId.delete(id);
      
      // Find and invalidate by user ID cache too
      for (const [userId, restaurantData] of restaurantCache.byUserId.entries()) {
        if (restaurantData.data.id === id) {
          restaurantCache.byUserId.delete(userId);
          break;
        }
      }
      
      return response.data;
    } catch (error) {
      console.error(`Error updating restaurant ${id}:`, error);
      throw error;
    }
  },
  
  // Menu related methods
  getMenuItems: async (restaurantId: string) => {
    try {
      console.log(`Fetching menu items for restaurant ${restaurantId}`);
      const response = await apiClient.get(`/restaurants/${restaurantId}/menu`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching menu items for restaurant ${restaurantId}:`, error);
      throw error;
    }
  },
  
  createMenuItem: async (data: Omit<MenuItem, 'id' | 'created_at'>) => {
    try {
      console.log('Creating menu item:', data);
      const response = await apiClient.post('/restaurants/menu-items', data);
      return response.data;
    } catch (error) {
      console.error('Error creating menu item:', error);
      throw error;
    }
  },
  
  updateMenuItem: async (id: string, data: Partial<MenuItem>) => {
    try {
      console.log(`Updating menu item ${id}:`, data);
      const response = await apiClient.put(`/restaurants/menu-items/${id}`, data);
      return response.data;
    } catch (error) {
      console.error(`Error updating menu item ${id}:`, error);
      throw error;
    }
  },
  
  deleteMenuItem: async (id: string) => {
    try {
      console.log(`Deleting menu item ${id}`);
      const response = await apiClient.delete(`/restaurants/menu-items/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting menu item ${id}:`, error);
      throw error;
    }
  },
  
  // Cache manipulation methods
  clearCache: (type?: 'byId' | 'byUserId' | 'all', key?: string) => {
    if (!type) {
      // Clear all caches
      restaurantCache.byId.clear();
      restaurantCache.byUserId.clear();
      restaurantCache.all = null;
      return;
    }
    
    if (type === 'all') {
      restaurantCache.all = null;
    } else if (key && type === 'byId') {
      restaurantCache.byId.delete(key);
    } else if (key && type === 'byUserId') {
      restaurantCache.byUserId.delete(key);
    } else if (!key) {
      if (type === 'byId') restaurantCache.byId.clear();
      if (type === 'byUserId') restaurantCache.byUserId.clear();
    }
  }
};
