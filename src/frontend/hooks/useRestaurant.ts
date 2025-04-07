import { useState, useEffect, useCallback } from 'react';
import { restaurantApi } from '@/api/services/restaurantService';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import { Restaurant } from '@/lib/database.types';

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
        result = await restaurantApi.getRestaurantById(id);
      } else if (user) {
        console.log(`Fetching restaurant by user ID: ${user.id}`);
        result = await restaurantApi.getRestaurantByUserId(user.id);
      }
      
      console.log('Restaurant fetch result:', result);
      
      // Only update state if component is still mounted
      setRestaurant(result);
      setLastFetched(now);
      return result;
    } catch (error) {
      console.error("Error fetching restaurant:", error);
      setError(error as Error);
      
      // Show toast only for non-404 errors to avoid excessive notifications
      if (!(error as any).response || (error as any).response.status !== 404) {
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
      console.log("Creating restaurant with data:", {
        ...data,
        user_id: user.id
      });
      
      const result = await restaurantApi.createRestaurant({
        name: data.name,
        address: data.address,
        lat: data.lat,
        lng: data.lng,
        user_id: user.id,
        image_url: data.image_url || null
      });
        
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
      const result = await restaurantApi.updateRestaurant(restaurant.id, data);
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

  return {
    restaurant,
    loading,
    error,
    fetchRestaurant,
    createRestaurant,
    updateRestaurant,
  };
}
