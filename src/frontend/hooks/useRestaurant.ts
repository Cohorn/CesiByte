
import { useState, useEffect, useCallback } from 'react';
import { restaurantApi } from '@/api/services/restaurantService';
import { Restaurant } from '@/lib/database.types';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export const useRestaurant = (initialRestaurantId?: string) => {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  const fetchRestaurant = useCallback(async (id?: string, forceRefresh: boolean = false) => {
    // If no id is provided, try to use the initialRestaurantId or the user's id
    const restaurantId = id || initialRestaurantId;
    const isUserIdFetch = !restaurantId && user && user.user_type === 'restaurant';
    
    if (!restaurantId && !isUserIdFetch) {
      console.log('No restaurant ID or user ID available for fetch');
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      let fetchedRestaurant: Restaurant | null = null;
      
      if (isUserIdFetch) {
        console.log(`Fetching restaurant for user ID: ${user.id}`);
        fetchedRestaurant = await restaurantApi.getRestaurantByUserId(user.id, forceRefresh);
      } else if (restaurantId) {
        console.log(`Fetching restaurant by ID: ${restaurantId}`);
        fetchedRestaurant = await restaurantApi.getRestaurantById(restaurantId, forceRefresh);
      }
      
      console.log('Fetched restaurant data:', fetchedRestaurant);
      setRestaurant(fetchedRestaurant);
      setLoading(false);
      return fetchedRestaurant;
    } catch (err) {
      console.error('Error fetching restaurant:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch restaurant data';
      setError(err instanceof Error ? err : new Error(errorMessage));
      setLoading(false);
      
      // Show toast for errors
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return null;
    }
  }, [initialRestaurantId, user]);

  // Fetch restaurant data on component mount if we have a restaurantId or if the user is a restaurant
  useEffect(() => {
    if (initialRestaurantId || (user && user.user_type === 'restaurant')) {
      fetchRestaurant();
    }
  }, [initialRestaurantId, user, fetchRestaurant]);

  const updateRestaurant = useCallback(async (data: Partial<Restaurant>) => {
    if (!restaurant) {
      console.error('Cannot update restaurant: No restaurant data available');
      return { success: false, error: new Error('No restaurant data available') };
    }
    
    try {
      const updatedRestaurant = await restaurantApi.updateRestaurant(restaurant.id, data);
      setRestaurant(updatedRestaurant);
      return { success: true, data: updatedRestaurant };
    } catch (err) {
      console.error('Error updating restaurant:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update restaurant';
      setError(err instanceof Error ? err : new Error(errorMessage));
      
      // Show toast for errors
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      return { success: false, error: err };
    }
  }, [restaurant]);

  return {
    restaurant,
    loading,
    error,
    fetchRestaurant,
    updateRestaurant
  };
};
