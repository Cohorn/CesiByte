import { apiClient } from '../client';
import { Restaurant, MenuItem } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

// Constants - consistent naming is key
const RESTAURANT_IMAGES_BUCKET = 'restaurant_images';

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
  ensureStorageBucket: async (): Promise<{success: boolean, bucketId: string | null, error?: string}> => {
    try {
      console.log("Checking if restaurant images bucket exists");
      
      // Try to list buckets and check if either target bucket exists
      const { data: buckets, error } = await supabase.storage.listBuckets();
        
      if (error) {
        console.error('Error listing buckets:', error);
        return { success: false, bucketId: null, error: `Storage service error: ${error.message}` };
      }
      
      if (!buckets || buckets.length === 0) {
        console.error('No storage buckets found');
        return { success: false, bucketId: null, error: "No storage buckets found" };
      }
      
      // Log all available buckets for debugging
      console.log("Available buckets:", buckets.map(b => `${b.id} (${b.name})`).join(', '));
      
      // Try multiple bucket name variants
      const possibleBucketNames = [
        'restaurant_images',
        'Restaurant Images',
        'restaurant-images',
        'restaurantimages'
      ];
      
      // Find a matching bucket with case-insensitive matching
      const targetBucket = buckets.find(bucket => {
        // Direct match
        if (bucket.id.toLowerCase() === RESTAURANT_IMAGES_BUCKET.toLowerCase() || 
            bucket.name.toLowerCase() === RESTAURANT_IMAGES_BUCKET.toLowerCase()) {
          return true;
        }
        
        // Check against all possible names
        return possibleBucketNames.some(name => 
          bucket.id.toLowerCase() === name.toLowerCase() || 
          bucket.name.toLowerCase() === name.toLowerCase()
        );
      });
      
      if (targetBucket) {
        console.log(`Found restaurant images bucket: ${targetBucket.id}`);
        
        // Try to list files in the bucket to ensure we have access
        const { error: listError } = await supabase.storage
          .from(targetBucket.id)
          .list();
          
        if (listError) {
          console.error('Error listing files in bucket:', listError);
          return { success: false, bucketId: null, error: `Cannot access bucket: ${listError.message}` };
        }
        
        console.log('Restaurant Images bucket found and accessible, continuing with upload');
        return { success: true, bucketId: targetBucket.id };
      } 
      
      // If no matching bucket, try to use any available bucket as a fallback
      if (buckets.length > 0) {
        const firstBucket = buckets[0];
        console.log(`No restaurant images bucket found. Attempting to use: ${firstBucket.id}`);
        
        // Check if we can use this bucket
        const { error: listError } = await supabase.storage
          .from(firstBucket.id)
          .list();
          
        if (!listError) {
          console.log(`Using bucket ${firstBucket.id} as fallback`);
          return { success: true, bucketId: firstBucket.id };
        }
      }
      
      // If we get here, we couldn't find any usable bucket
      console.error("No usable storage bucket found");
      return { success: false, bucketId: null, error: "Storage configuration missing" };
    } catch (error) {
      console.error('Error checking for Restaurant Images bucket:', error);
      return { success: false, bucketId: null, error: "Error checking storage configuration" };
    }
  },
  
  // Helper function to upload an image to any available bucket
  uploadImage: async (file: File, path: string): Promise<string> => {
    // Try to ensure a storage bucket is available
    const { success, bucketId, error } = await restaurantApi.ensureStorageBucket();
    
    if (!success || !bucketId) {
      throw new Error(error || "Storage configuration missing. Please contact support.");
    }
    
    // Upload the file to the bucket
    const { data, error: uploadError } = await supabase.storage
      .from(bucketId)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true
      });
      
    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }
    
    if (!data?.path) {
      throw new Error('Upload succeeded but no file path was returned');
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketId)
      .getPublicUrl(data.path);
      
    return publicUrl;
  }
};
