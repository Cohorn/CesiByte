
import { useState, useEffect, useCallback } from 'react';
import { restaurantApi } from '@/api/services/restaurantService';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import { Restaurant } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export function useRestaurant() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchRestaurant = useCallback(async (id?: string, force = false) => {
    // Skip if no identifiers available
    if (!id && !user) {
      console.log('useRestaurant: No ID or user available for fetching restaurant');
      return null;
    }
    
    // Skip fetching if we've already fetched within the last 5 minutes and not forcing refresh
    const now = Date.now();
    if (!force && lastFetched && (now - lastFetched) < 300000 && restaurant) {
      console.log('Skipping restaurant fetch - data is fresh');
      return restaurant;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      let result;
      
      if (id) {
        console.log(`Fetching restaurant by ID: ${id}`);
        const { data, error: fetchError } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', id)
          .single();
          
        if (fetchError) {
          throw fetchError;
        }
        
        result = data;
      } else if (user) {
        console.log(`Fetching restaurant by user ID: ${user.id}`);
        const { data, error: fetchError } = await supabase
          .from('restaurants')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            // No restaurant found for this user
            return null;
          }
          throw fetchError;
        }
        
        result = data;
      }
      
      console.log('Restaurant fetch result:', result);
      
      setRestaurant(result);
      setLastFetched(now);
      return result;
    } catch (error) {
      console.error("Error fetching restaurant:", error);
      setError(error as Error);
      
      // Show toast only for non-404 errors to avoid excessive notifications
      if ((error as any).code !== 'PGRST116') {
        toast({
          title: "Error",
          description: "Could not fetch restaurant data",
          variant: "destructive",
        });
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, toast, restaurant, lastFetched]);

  // Auto-fetch restaurant data when user type is restaurant
  useEffect(() => {
    if (user && user.user_type === 'restaurant') {
      console.log("useRestaurant hook - User is restaurant type, fetching data");
      fetchRestaurant();
    }
  }, [user, fetchRestaurant]);

  const createRestaurant = async (data: Omit<Restaurant, 'id' | 'created_at'>) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a restaurant",
        variant: "destructive",
      });
      return null;
    }
    
    // Validate coordinates or fallback to user coordinates
    if (!data.lat || !data.lng || isNaN(data.lat) || isNaN(data.lng) || 
        data.lat < -90 || data.lat > 90 || data.lng < -180 || data.lng > 180) {
      console.log("Invalid coordinates, using user coordinates instead");
      data.lat = user.lat || 0;
      data.lng = user.lng || 0;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Make sure user_id is included and defined
      const restaurantData = {
        ...data,
        user_id: user.id
      };
      
      console.log("Creating restaurant with data:", restaurantData);
      
      // Use Supabase directly
      const { data: result, error: createError } = await supabase
        .from('restaurants')
        .insert({
          name: restaurantData.name,
          address: restaurantData.address,
          lat: restaurantData.lat,
          lng: restaurantData.lng,
          user_id: user.id, // Explicitly set user_id
          image_url: restaurantData.image_url || null
        })
        .select()
        .single();
        
      if (createError) {
        throw createError;
      }
      
      setRestaurant(result);
      setLastFetched(Date.now());
      toast({
        title: "Success",
        description: "Restaurant created successfully",
      });
      return result;
    } catch (error) {
      console.error("Error creating restaurant:", error);
      setError(error as Error);
      toast({
        title: "Error",
        description: "Could not create restaurant",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateRestaurant = async (data: Partial<Restaurant>) => {
    if (!restaurant) {
      toast({
        title: "Error",
        description: "No restaurant to update",
        variant: "destructive",
      });
      return null;
    }
    
    // Validate coordinates if provided
    if (data.lat !== undefined && data.lng !== undefined) {
      if (isNaN(data.lat) || isNaN(data.lng) || 
          data.lat < -90 || data.lat > 90 || data.lng < -180 || data.lng > 180) {
        // Keep existing coordinates if new ones are invalid
        data.lat = restaurant.lat;
        data.lng = restaurant.lng;
      }
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Updating restaurant ${restaurant.id} with data:`, data);
      
      // Use Supabase directly
      const { data: result, error: updateError } = await supabase
        .from('restaurants')
        .update(data)
        .eq('id', restaurant.id)
        .select()
        .single();
        
      if (updateError) {
        throw updateError;
      }
      
      setRestaurant(result);
      setLastFetched(Date.now());
      toast({
        title: "Success",
        description: "Restaurant updated successfully",
      });
      return result;
    } catch (error) {
      console.error("Error updating restaurant:", error);
      setError(error as Error);
      toast({
        title: "Error",
        description: "Could not update restaurant",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteRestaurant = async () => {
    if (!restaurant) {
      toast({
        title: "Error",
        description: "No restaurant to delete",
        variant: "destructive",
      });
      return false;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Deleting restaurant ${restaurant.id}`);
      
      // Use Supabase directly
      const { error: deleteError } = await supabase
        .from('restaurants')
        .delete()
        .eq('id', restaurant.id);
        
      if (deleteError) {
        throw deleteError;
      }
      
      setRestaurant(null);
      setLastFetched(null);
      toast({
        title: "Success",
        description: "Restaurant deleted successfully",
      });
      return true;
    } catch (error) {
      console.error("Error deleting restaurant:", error);
      setError(error as Error);
      toast({
        title: "Error",
        description: "Could not delete restaurant",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    restaurant,
    loading,
    error,
    fetchRestaurant,
    createRestaurant,
    updateRestaurant,
    deleteRestaurant,
  };
}
