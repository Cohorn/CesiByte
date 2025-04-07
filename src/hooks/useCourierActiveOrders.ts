
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

interface Restaurant {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  user_id: string;
}

interface Review {
  id: string;
  rating: number;
  comment?: string;
  created_at: string;
  user_id: string;
  courier_id?: string;
}

interface Reviewer {
  id: string;
  name: string;
}

export function useCourierActiveOrders(courierId: string | null) {
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
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
          restaurants:restaurant_id(id, name, address, lat, lng, user_id)
        `)
        .eq('courier_id', courierId)
        .in('status', ['picked_up', 'on_the_way']);
      
      if (error) throw error;
      
      // Process to add restaurant data to main object
      const processedOrders = data.map(order => {
        // Explicitly add delivery_pin with a default value if not present
        const delivery_pin = order.delivery_pin || '0000'; // Default pin if not present
        
        return {
          ...order,
          delivery_pin,
          restaurant_name: order.restaurants?.name || 'Unknown Restaurant',
          restaurant_address: order.restaurants?.address || 'Unknown Address',
          restaurant_lat: order.restaurants?.lat || 0,
          restaurant_lng: order.restaurants?.lng || 0,
        } as ActiveOrder;
      });
      
      // Extract restaurants data
      const restaurantData = data
        .map(order => order.restaurants)
        .filter(r => r !== null) as Restaurant[];
        
      setActiveOrders(processedOrders);
      setRestaurants(restaurantData);
      setLoading(false);
      return processedOrders;
    } catch (err) {
      console.error('Error fetching active orders:', err);
      setError(err as Error);
      setLoading(false);
      return [];
    }
  }, [courierId]);

  // Fetch courier reviews
  const fetchReviews = useCallback(async () => {
    if (!courierId) return;
    
    try {
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('*')
        .eq('courier_id', courierId);
        
      if (reviewsError) throw reviewsError;
      
      if (reviewsData && reviewsData.length > 0) {
        setReviews(reviewsData);
        
        // Calculate average rating
        const totalRating = reviewsData.reduce((sum, review) => sum + review.rating, 0);
        setAverageRating(totalRating / reviewsData.length);
        
        // Fetch reviewers information
        const userIds = [...new Set(reviewsData.map(review => review.user_id))];
        
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, name')
          .in('id', userIds);
          
        if (usersError) throw usersError;
        
        if (usersData) {
          setReviewers(usersData);
        }
      } else {
        setReviews([]);
        setAverageRating(null);
        setReviewers([]);
      }
    } catch (err) {
      console.error('Error fetching courier reviews:', err);
    }
  }, [courierId]);

  // Update order status function
  const updateOrderStatus = useCallback(async (orderId: string, newStatus: OrderStatus) => {
    if (!courierId) return false;
    
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .eq('courier_id', courierId);
        
      if (error) throw error;
      
      // Refetch orders to update the UI
      fetchActiveOrders();
      return true;
    } catch (err) {
      console.error('Error updating order status:', err);
      return false;
    }
  }, [courierId, fetchActiveOrders]);

  useEffect(() => {
    if (courierId) {
      fetchActiveOrders();
      fetchReviews();
    }
  }, [courierId, fetchActiveOrders, fetchReviews]);

  return {
    activeOrders,
    restaurants,
    reviews,
    reviewers,
    averageRating,
    loading,
    error,
    refetch: fetchActiveOrders,
    updateOrderStatus
  };
}
