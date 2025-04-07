
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Order, OrderStatus, Restaurant } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

export function useAvailableOrders() {
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [restaurants, setRestaurants] = useState<{ [id: string]: Restaurant }>({});
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const { toast } = useToast();

  const fetchAvailableOrders = useCallback(async (force = false) => {
    // Skip fetching if we've already fetched within the last 30 seconds and not forcing refresh
    const now = Date.now();
    if (!force && lastFetched && (now - lastFetched) < 30000) {
      console.log('Skipping available orders fetch - data is fresh');
      return;
    }

    setLoading(true);
    try {
      // Fetch orders without assigned couriers
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .is('courier_id', null)
        .eq('status', 'ready_for_pickup')
        .order('created_at', { ascending: false });
          
      if (error) {
        console.error("Error fetching available orders:", error);
        toast({
          title: "Error",
          description: "Failed to load available orders",
          variant: "destructive",
        });
        return;
      }
      
      if (data) {
        const typedOrders = data.map(order => ({
          ...order,
          status: order.status as OrderStatus
        })) as Order[];
        setAvailableOrders(typedOrders);
      }

      // Fetch restaurants for these orders
      if (data && data.length > 0) {
        const restaurantIds = [...new Set(data.map(order => order.restaurant_id))];
        const { data: restaurantData, error: restaurantError } = await supabase
          .from('restaurants')
          .select('*')
          .in('id', restaurantIds);
            
        if (restaurantError) {
          console.error("Error fetching restaurants:", restaurantError);
        } else if (restaurantData) {
          const restaurantMap = restaurantData.reduce((acc, restaurant) => {
            acc[restaurant.id] = restaurant;
            return acc;
          }, {} as { [id: string]: Restaurant });
          setRestaurants(restaurantMap);
        }
      }
      
      setLastFetched(now);
    } catch (error) {
      console.error("Error fetching available orders:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, lastFetched]);

  // Accept order function
  const acceptOrder = async (orderId: string, courierId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          courier_id: courierId,
          status: 'picked_up'
        })
        .eq('id', orderId);
      
      if (error) {
        console.error("Error accepting order:", error);
        toast({
          title: "Error",
          description: "Could not accept order",
          variant: "destructive",
        });
        return false;
      } else {
        toast({
          title: "Success",
          description: "Order accepted successfully",
        });
        
        // Update local state
        setAvailableOrders(prevOrders => 
          prevOrders.filter(order => order.id !== orderId)
        );
        return true;
      }
    } catch (error) {
      console.error("Error accepting order:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    }
  };

  // Set up polling
  useEffect(() => {
    fetchAvailableOrders();

    // Set up a simplified subscription instead of full realtime
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchAvailableOrders(true);
      }
    }, 60000); // Check every minute when the page is visible

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchAvailableOrders(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchAvailableOrders]);

  return {
    availableOrders,
    restaurants,
    loading,
    lastFetched,
    fetchAvailableOrders,
    acceptOrder,
    getLastFetchedText: () => lastFetched 
      ? formatDistanceToNow(lastFetched, { addSuffix: true }) 
      : ''
  };
}
