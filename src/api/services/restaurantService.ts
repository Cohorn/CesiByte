
import { apiClient } from '../client';
import { Restaurant, MenuItem } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export const restaurantApi = {
  getAllRestaurants: async () => {
    console.log('Fetching all restaurants');
    try {
      const response = await apiClient.get('/restaurants');
      console.log('Fetched restaurants successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching all restaurants:', error);
      throw error;
    }
  },

  getRestaurantById: async (id: string) => {
    console.log(`Fetching restaurant by ID: ${id}`);
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error fetching restaurant by ID ${id}:`, error);
      throw error;
    }
  },

  getRestaurantByUserId: async (userId: string) => {
    console.log(`Fetching restaurant by user ID: ${userId}`);
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error fetching restaurant by user ID ${userId}:`, error);
      throw error;
    }
  },

  createRestaurant: async (data: Omit<Restaurant, 'id' | 'created_at'>) => {
    console.log('Creating restaurant with data:', data);
    try {
      if (!data.user_id) {
        console.error('Error: user_id is required to create a restaurant');
        throw new Error('User ID is required to create a restaurant');
      }
      
      const { data: result, error } = await supabase
        .from('restaurants')
        .insert({
          name: data.name,
          address: data.address,
          lat: data.lat,
          lng: data.lng,
          user_id: data.user_id,
          image_url: data.image_url || null
        })
        .select()
        .single();
        
      if (error) {
        console.error('Supabase error creating restaurant:', error);
        throw error;
      }
      
      console.log('Restaurant created successfully via Supabase:', result);
      return result as Restaurant;
    } catch (error) {
      console.error('Error creating restaurant:', error);
      throw error;
    }
  },

  updateRestaurant: async (id: string, data: Partial<Restaurant>) => {
    console.log(`Updating restaurant ${id} with data:`, data);
    try {
      const { data: result, error } = await supabase
        .from('restaurants')
        .update(data)
        .eq('id', id)
        .select()
        .single();
        
      if (error) {
        console.error('Supabase error updating restaurant:', error);
        throw error;
      }
      
      console.log('Restaurant updated successfully via Supabase:', result);
      return result as Restaurant;
    } catch (error) {
      console.error(`Error updating restaurant ${id}:`, error);
      throw error;
    }
  },

  deleteRestaurant: async (id: string) => {
    console.log(`Deleting restaurant ${id}`);
    try {
      const { error } = await supabase
        .from('restaurants')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error('Supabase error deleting restaurant:', error);
        throw error;
      }
      
      console.log('Restaurant deleted successfully via Supabase');
      return true;
    } catch (error) {
      console.error(`Error deleting restaurant ${id}:`, error);
      throw error;
    }
  },

  getMenuItems: async (restaurantId: string) => {
    console.log(`Fetching menu items for restaurant ${restaurantId}`);
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId);
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error fetching menu items for restaurant ${restaurantId}:`, error);
      throw error;
    }
  },

  createMenuItem: async (data: Omit<MenuItem, 'id' | 'created_at'>) => {
    console.log('Creating menu item with data:', data);
    try {
      const { data: result, error } = await supabase
        .from('menu_items')
        .insert(data)
        .select()
        .single();
        
      if (error) throw error;
      return result;
    } catch (error) {
      console.error('Error creating menu item:', error);
      throw error;
    }
  },

  updateMenuItem: async (id: string, data: Partial<MenuItem>) => {
    console.log(`Updating menu item ${id} with data:`, data);
    try {
      const { data: result, error } = await supabase
        .from('menu_items')
        .update(data)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      return result;
    } catch (error) {
      console.error(`Error updating menu item ${id}:`, error);
      throw error;
    }
  },

  deleteMenuItem: async (id: string) => {
    console.log(`Deleting menu item ${id}`);
    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`Error deleting menu item ${id}:`, error);
      throw error;
    }
  },
  
  ensureStorageBucket: async () => {
    try {
      console.log('Checking if restaurant_images bucket exists');
      
      const { data: buckets, error } = await supabase
        .storage
        .listBuckets();
        
      if (error) {
        console.error('Error listing buckets:', error);
        return false;
      }
      
      const bucketExists = buckets.some(bucket => bucket.name === 'restaurant_images');
      console.log('Bucket exists check result:', bucketExists);
      
      if (!bucketExists) {
        console.log('Restaurant_images bucket not found, creating it...');
        const { error: createError } = await supabase.storage.createBucket('restaurant_images', {
          public: true
        });
        
        if (createError) {
          console.error('Error creating bucket:', createError);
          return false;
        }
        
        console.log('Bucket created successfully');
        
        // Use the correct URL with environment variables
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://ukrukdqjvvsvfvmqzxdv.supabase.co";
        const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcnVrZHFqdnZzdmZ2bXF6eGR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0MDYxMTcsImV4cCI6MjA1ODk4MjExN30.V9T0HKUznzB1Gp1_RpwrDADDWfvRXdtehx5y0u6hK4c";
        
        const storageUrl = `${supabaseUrl}/functions/v1/create_storage_policy`;
        
        const response = await fetch(storageUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({ bucketName: 'restaurant_images' })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error creating access policies:', errorData);
        } else {
          console.log('Public access policies created successfully');
        }
        
        return true;
      }
      
      console.log('Bucket already exists, no need to create');
      return true;
    } catch (error) {
      console.error('Error ensuring storage bucket exists:', error);
      return false;
    }
  }
};
