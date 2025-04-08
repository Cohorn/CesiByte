
import { useState, useEffect, useCallback } from 'react';
import { restaurantApi } from '@/api/services/restaurantService';
import { Restaurant, MenuItem } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';

export function useRestaurant(initialId?: string) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchRestaurant = useCallback(async (id?: string, showErrors = false) => {
    const restaurantId = id || initialId;
    
    if (!restaurantId) {
      console.log('No restaurant ID provided for fetching');
      setLoading(false);
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching restaurant data for ID: ${restaurantId}`);
      
      // First try by direct restaurant ID
      let restaurantData: Restaurant | null = null;
      
      try {
        restaurantData = await restaurantApi.getRestaurant(restaurantId);
      } catch (err) {
        console.log(`Restaurant not found by ID, trying as user ID: ${restaurantId}`);
        
        try {
          restaurantData = await restaurantApi.getRestaurantByUser(restaurantId);
        } catch (userErr) {
          console.error('Error fetching restaurant by user ID:', userErr);
          throw new Error('Restaurant not found');
        }
      }
      
      if (restaurantData) {
        console.log('Restaurant fetched successfully:', restaurantData);
        setRestaurant(restaurantData);
        setLoading(false);
        return restaurantData;
      } else {
        throw new Error('Restaurant not found');
      }
    } catch (err) {
      console.error('Error fetching restaurant:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch restaurant'));
      setLoading(false);
      
      if (showErrors) {
        toast({
          title: "Error",
          description: "Could not load restaurant data",
          variant: "destructive"
        });
      }
      
      return null;
    }
  }, [initialId, toast]);

  useEffect(() => {
    if (initialId) {
      fetchRestaurant(initialId);
    } else {
      setLoading(false);
    }
  }, [initialId, fetchRestaurant]);

  return {
    restaurant,
    loading,
    error,
    fetchRestaurant
  };
}
