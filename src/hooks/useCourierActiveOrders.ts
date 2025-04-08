
// This is a simplified version for demonstration
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { OrderStatus } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';

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
  delivery_pin?: string; // Make this optional since it might not exist in all orders
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchActiveOrders = useCallback(async () => {
    if (!courierId) {
      setActiveOrders([]);
      setLoading(false);
      return [];
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching active orders for courier: ${courierId}`);
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          restaurants:restaurant_id(id, name, address, lat, lng, user_id)
        `)
        .eq('courier_id', courierId)
        .in('status', ['picked_up', 'on_the_way']);
      
      if (error) {
        console.error('Error fetching active orders:', error);
        throw error;
      }
      
      console.log(`Retrieved ${data?.length || 0} active orders`);
      
      if (!data) {
        setActiveOrders([]);
        setRestaurants([]);
        setLoading(false);
        return [];
      }
      
      // Process to add restaurant data to main object
      const processedOrders = data.map(order => {
        // Create a new object with all order properties and additional needed properties
        return {
          ...order,
          // Default delivery_pin if not present
          delivery_pin: order.delivery_pin || '0000', 
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
      setError(err instanceof Error ? err : new Error('Failed to fetch active orders'));
      
      toast({
        title: "Error",
        description: "Could not fetch active orders. Please try again.",
        variant: "destructive",
      });
      
      setLoading(false);
      return [];
    }
  }, [courierId, toast]);

  // Fetch courier reviews
  const fetchReviews = useCallback(async () => {
    if (!courierId) return;
    
    try {
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('*')
        .eq('courier_id', courierId);
        
      if (reviewsError) {
        console.error("Error fetching courier reviews:", reviewsError);
        return;
      }
      
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
          
        if (usersError) {
          console.error("Error fetching reviewers:", usersError);
        } else if (usersData) {
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
        
      if (error) {
        console.error('Error updating order status:', error);
        toast({
          title: "Error",
          description: "Could not update order status. Please try again.",
          variant: "destructive",
        });
        return false;
      } else {
        toast({
          title: "Success",
          description: `Order status updated to ${newStatus.replace(/_/g, ' ')}`,
        });
        
        // Refetch orders to update the UI
        fetchActiveOrders();
        return true;
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }, [courierId, toast, fetchActiveOrders]);

  useEffect(() => {
    if (courierId) {
      fetchActiveOrders();
      fetchReviews();
    } else {
      // Reset state if courier ID is null
      setActiveOrders([]);
      setLoading(false);
      setError(null);
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
