
import { apiClient } from '../client';
import { Restaurant, MenuItem } from '@/lib/database.types';

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
      const response = await apiClient.get(`/restaurants/${id}`);
      console.log('Fetched restaurant by ID successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error fetching restaurant by ID ${id}:`, error);
      throw error;
    }
  },

  getRestaurantByUserId: async (userId: string) => {
    console.log(`Fetching restaurant by user ID: ${userId}`);
    try {
      const response = await apiClient.get(`/restaurants/user/${userId}`);
      console.log('Fetched restaurant by user ID successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error fetching restaurant by user ID ${userId}:`, error);
      throw error;
    }
  },

  createRestaurant: async (data: Omit<Restaurant, 'id' | 'created_at'>) => {
    console.log('Creating restaurant with data:', data);
    try {
      // Use supabase directly instead of the backend API
      const { supabase } = await import('@/lib/supabase');
      
      const { data: result, error } = await supabase
        .from('restaurants')
        .insert(data)
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
      // Use supabase directly instead of the backend API
      const { supabase } = await import('@/lib/supabase');
      
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

  // Menu items
  getMenuItems: async (restaurantId: string) => {
    console.log(`Fetching menu items for restaurant ${restaurantId}`);
    try {
      const response = await apiClient.get(`/restaurants/${restaurantId}/menu`);
      console.log('Menu items fetched successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error fetching menu items for restaurant ${restaurantId}:`, error);
      throw error;
    }
  },

  createMenuItem: async (data: Omit<MenuItem, 'id' | 'created_at'>) => {
    console.log('Creating menu item with data:', data);
    try {
      const response = await apiClient.post('/menu-items', data);
      console.log('Menu item created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating menu item:', error);
      throw error;
    }
  },

  updateMenuItem: async (id: string, data: Partial<MenuItem>) => {
    console.log(`Updating menu item ${id} with data:`, data);
    try {
      const response = await apiClient.put(`/menu-items/${id}`, data);
      console.log('Menu item updated successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error updating menu item ${id}:`, error);
      throw error;
    }
  },

  deleteMenuItem: async (id: string) => {
    console.log(`Deleting menu item ${id}`);
    try {
      const response = await apiClient.delete(`/menu-items/${id}`);
      console.log('Menu item deleted successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error deleting menu item ${id}:`, error);
      throw error;
    }
  }
};
