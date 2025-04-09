
import { apiClient } from '../client';
import { Restaurant, MenuItem } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

// Constants
const RESTAURANT_IMAGES_BUCKET = 'Restaurant Images';

// Define the restaurant API
export const restaurantApi = {
  // Get all restaurants
  getRestaurants: async (options?: { lat?: number; lng?: number; search?: string }) => {
    let endpoint = '/restaurants';
    const params = new URLSearchParams();
    
    if (options?.lat && options?.lng) {
      params.append('lat', options.lat.toString());
      params.append('lng', options.lng.toString());
    }
    
    if (options?.search) {
      params.append('search', options.search);
    }
    
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }
    
    const response = await apiClient.get(endpoint);
    return response.data;
  },
  
  // Get a specific restaurant
  getRestaurant: async (id: string) => {
    const response = await apiClient.get(`/restaurants/${id}`);
    return response.data;
  },
  
  // Get restaurant by user ID
  getRestaurantByUser: async (userId: string) => {
    const response = await apiClient.get(`/restaurants/user/${userId}`);
    return response.data;
  },
  
  // Get restaurant for the current user
  getCurrentUserRestaurant: async () => {
    try {
      const response = await apiClient.get('/restaurants/my-restaurant');
      return response.data;
    } catch (error) {
      console.error('Error getting current user restaurant:', error);
      throw error;
    }
  },
  
  // Create a new restaurant
  createRestaurant: async (restaurantData: Omit<Restaurant, 'id' | 'created_at'>) => {
    try {
      console.log('Creating restaurant with data:', restaurantData);
      const response = await apiClient.post('/restaurants', restaurantData);
      return response.data;
    } catch (error) {
      console.error('Error creating restaurant:', error);
      throw error;
    }
  },
  
  // Update an existing restaurant
  updateRestaurant: async (id: string, restaurantData: Partial<Restaurant>) => {
    const response = await apiClient.put(`/restaurants/${id}`, restaurantData);
    return response.data;
  },
  
  // Delete a restaurant
  deleteRestaurant: async (id: string) => {
    const response = await apiClient.delete(`/restaurants/${id}`);
    return response.data;
  },
  
  // Get menu items for a restaurant
  getMenuItems: async (restaurantId: string) => {
    const response = await apiClient.get(`/restaurants/${restaurantId}/menu`);
    return response.data;
  },
  
  // Add a menu item
  addMenuItem: async (restaurantId: string, menuItem: Omit<MenuItem, 'id' | 'created_at'>) => {
    const response = await apiClient.post(`/restaurants/${restaurantId}/menu`, menuItem);
    return response.data;
  },
  
  // Update a menu item
  updateMenuItem: async (restaurantId: string, itemId: string, menuItem: Partial<MenuItem>) => {
    const response = await apiClient.put(`/restaurants/${restaurantId}/menu/${itemId}`, menuItem);
    return response.data;
  },
  
  // Delete a menu item
  deleteMenuItem: async (restaurantId: string, itemId: string) => {
    const response = await apiClient.delete(`/restaurants/${restaurantId}/menu/${itemId}`);
    return response.data;
  },
  
  // Get nearby restaurants
  getNearbyRestaurants: async (lat: number, lng: number, radius?: number) => {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString()
    });
    
    if (radius) {
      params.append('radius', radius.toString());
    }
    
    const response = await apiClient.get(`/restaurants/nearby?${params.toString()}`);
    return response.data;
  },
  
  // Direct Supabase methods for restaurants
  supabase: {
    // Get all restaurants
    getRestaurants: async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*');
        
      if (error) {
        console.error('Supabase error getting restaurants:', error);
        throw error;
      }
      
      return data;
    },
    
    // Get a specific restaurant
    getRestaurant: async (id: string) => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) {
        console.error(`Supabase error getting restaurant ${id}:`, error);
        throw error;
      }
      
      return data;
    },
    
    // Get restaurant by user ID
    getRestaurantByUser: async (userId: string) => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') {
          // No restaurant found for this user - this is not a true error
          return null;
        }
        console.error(`Supabase error getting restaurant for user ${userId}:`, error);
        throw error;
      }
      
      return data;
    },
    
    // Create a new restaurant
    createRestaurant: async (restaurantData: Omit<Restaurant, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('restaurants')
        .insert(restaurantData)
        .select()
        .single();
        
      if (error) {
        console.error('Supabase error creating restaurant:', error);
        throw error;
      }
      
      return data;
    },
    
    // Update an existing restaurant
    updateRestaurant: async (id: string, restaurantData: Partial<Restaurant>) => {
      const { data, error } = await supabase
        .from('restaurants')
        .update(restaurantData)
        .eq('id', id)
        .select()
        .single();
        
      if (error) {
        console.error(`Supabase error updating restaurant ${id}:`, error);
        throw error;
      }
      
      return data;
    },
    
    // Delete a restaurant
    deleteRestaurant: async (id: string) => {
      const { error } = await supabase
        .from('restaurants')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error(`Supabase error deleting restaurant ${id}:`, error);
        throw error;
      }
      
      return true;
    }
  },
  
  // Check if storage bucket exists and is accessible
  ensureStorageBucket: async (): Promise<boolean> => {
    try {
      console.log("Checking if restaurant images bucket exists");
      
      // Try to list buckets and check if either target bucket exists
      const { data: buckets, error } = await supabase.storage.listBuckets();
        
      if (error) {
        console.error('Error listing buckets:', error);
        return false;
      }
      
      // Check for either bucket name
      const bucketExists = buckets.some(bucket => 
        bucket.id === 'restaurant_images' || 
        bucket.id === 'Restaurant Images'
      );
      
      if (bucketExists) {
        const bucket = buckets.find(b => 
          b.id === 'restaurant_images' || 
          b.id === 'Restaurant Images'
        );
        
        console.log(`Found restaurant images bucket: ${bucket?.id}`);
        
        // Try to list files in the bucket to ensure we have access
        const { error: listError } = await supabase.storage
          .from(bucket!.id)
          .list();
          
        if (listError) {
          console.error('Error listing files in bucket:', listError);
          return false;
        }
        
        console.log('Restaurant Images bucket found and accessible, continuing with upload');
        return true;
      } else {
        console.error("Restaurant images bucket not found. Available buckets:", 
          buckets.map(b => b.id).join(', '));
        return false;
      }
    } catch (error) {
      console.error('Error checking for Restaurant Images bucket:', error);
      return false;
    }
  }
};
