
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
    
    console.log(`Fetching all restaurants with endpoint: ${endpoint}`);
    const response = await apiClient.get(endpoint);
    return response.data;
  },
  
  // Get a specific restaurant
  getRestaurant: async (id: string) => {
    console.log(`Fetching restaurant with ID: ${id} from /restaurants/${id}`);
    const response = await apiClient.get(`/restaurants/${id}`);
    return response.data;
  },
  
  // Get restaurant by user ID
  getRestaurantByUser: async (userId: string) => {
    console.log(`Fetching restaurant for user ID: ${userId} from /restaurants/user/${userId}`);
    const response = await apiClient.get(`/restaurants/user/${userId}`);
    console.log('Response from getRestaurantByUser:', response.data);
    return response.data;
  },
  
  // Get restaurant for the current user
  getCurrentUserRestaurant: async () => {
    try {
      console.log('Fetching restaurant for current user from /restaurants/my-restaurant');
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
    console.log(`Updating restaurant ${id} with data:`, restaurantData);
    const response = await apiClient.put(`/restaurants/${id}`, restaurantData);
    return response.data;
  },
  
  // Delete a restaurant
  deleteRestaurant: async (id: string) => {
    console.log(`Deleting restaurant ${id}`);
    const response = await apiClient.delete(`/restaurants/${id}`);
    return response.data;
  },
  
  // Get menu items for a restaurant
  getMenuItems: async (restaurantId: string) => {
    console.log(`Fetching menu items for restaurant: ${restaurantId} from /restaurants/${restaurantId}/menu`);
    try {
      const response = await apiClient.get(`/restaurants/${restaurantId}/menu`);
      console.log('Menu items response:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error fetching menu items for restaurant ${restaurantId}:`, error);
      throw error;
    }
  },
  
  // Add a menu item
  addMenuItem: async (restaurantId: string, menuItem: Omit<MenuItem, 'id' | 'created_at'>) => {
    console.log(`Adding menu item to restaurant ${restaurantId}:`, menuItem);
    const response = await apiClient.post(`/restaurants/${restaurantId}/menu`, menuItem);
    return response.data;
  },
  
  // Update a menu item
  updateMenuItem: async (restaurantId: string, itemId: string, menuItem: Partial<MenuItem>) => {
    console.log(`Updating menu item ${itemId} for restaurant ${restaurantId}:`, menuItem);
    const response = await apiClient.put(`/restaurants/${restaurantId}/menu/${itemId}`, menuItem);
    return response.data;
  },
  
  // Delete a menu item
  deleteMenuItem: async (restaurantId: string, itemId: string) => {
    console.log(`Deleting menu item ${itemId} from restaurant ${restaurantId}`);
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
  
  // Create an order
  createOrder: async (orderData: any) => {
    console.log('Creating order with data:', orderData);
    try {
      const response = await apiClient.post('/orders', orderData);
      console.log('Order created:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
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
      console.log(`Checking if "${RESTAURANT_IMAGES_BUCKET}" bucket exists`);
      
      // Try to list buckets and check if our target bucket exists
      const { data: buckets, error } = await supabase.storage.listBuckets();
        
      if (error) {
        console.error('Error listing buckets:', error);
        return false;
      }
      
      const bucketExists = buckets.some(bucket => bucket.name === RESTAURANT_IMAGES_BUCKET);
      console.log('Bucket exists check result:', bucketExists);
      
      if (bucketExists) {
        // Try to list files in the bucket to ensure we have access
        const { data: files, error: listError } = await supabase.storage
          .from(RESTAURANT_IMAGES_BUCKET)
          .list();
          
        if (listError) {
          console.error('Error listing files in bucket:', listError);
          return false;
        }
        
        console.log('Restaurant Images bucket found and accessible, continuing with upload');
        return true;
      } else {
        console.error(`"${RESTAURANT_IMAGES_BUCKET}" bucket not found. Please ensure it exists in Supabase Storage.`);
        return false;
      }
    } catch (error) {
      console.error('Error checking for Restaurant Images bucket:', error);
      return false;
    }
  }
};
