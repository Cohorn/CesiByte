
// This is a simplified version for demonstration
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { OrderStatus } from '@/lib/database.types';

export interface ActiveOrder {
  id: string;
  user_id: string;
  restaurant_id: string;
  courier_id: string | null;
  status: OrderStatus;
  items: any;
  total_price: number;
  delivery_address: string;
  delivery_lat: number;
  delivery_lng: number;
  delivery_pin: string;
  created_at: string;
  updated_at: string;
  // Additional properties from join
  restaurant_name: string;
  restaurant_address: string;
  restaurant_lat: number;
  restaurant_lng: number;
}

export function useCourierActiveOrders(courierId: string | null) {
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchActiveOrders = useCallback(async () => {
    if (!courierId) return [];
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          restaurants:restaurant_id(name, address, lat, lng)
        `)
        .eq('courier_id', courierId)
        .in('status', ['picked_up', 'on_the_way']);
      
      if (error) throw error;
      
      // Process to add restaurant data to main object
      const processedOrders = data.map(order => {
        return {
          ...order,
          delivery_pin: order.delivery_pin || '0000', // Default pin if not present
          restaurant_name: order.restaurants?.name || 'Unknown Restaurant',
          restaurant_address: order.restaurants?.address || 'Unknown Address',
          restaurant_lat: order.restaurants?.lat || 0,
          restaurant_lng: order.restaurants?.lng || 0,
        } as ActiveOrder;
      });
      
      setActiveOrders(processedOrders);
      setLoading(false);
      return processedOrders;
    } catch (err) {
      console.error('Error fetching active orders:', err);
      setError(err as Error);
      setLoading(false);
      return [];
    }
  }, [courierId]);

  useEffect(() => {
    if (courierId) {
      fetchActiveOrders();
    }
  }, [courierId, fetchActiveOrders]);

  return {
    activeOrders,
    loading,
    error,
    refetch: fetchActiveOrders
  };
}
