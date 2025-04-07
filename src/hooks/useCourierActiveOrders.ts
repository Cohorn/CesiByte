
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Order, OrderStatus, SimpleUser } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';
import { useReviews } from '@/hooks/useReviews';
import { ActiveOrder, RestaurantData } from '@/types/courier';

export function useCourierActiveOrders(courierId?: string) {
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [reviewers, setReviewers] = useState<SimpleUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  const initCompletedRef = useRef(false);
  
  // Use memoized courierId for useReviews to prevent unnecessary re-fetches
  const reviewsParams = useCallback(() => ({ 
    courierId: courierId 
  }), [courierId]);
  
  // Use isLoading instead of loading and correctly handle the error
  const { 
    reviews, 
    isLoading: reviewsLoading, 
    error: reviewsError,
    refetch: refetchReviews,
    averageRating
  } = useReviews(reviewsParams());
  
  // Handle reviews error separately
  useEffect(() => {
    if (reviewsError) {
      setError(reviewsError.message);
    }
  }, [reviewsError]);

  const fetchActiveOrders = useCallback(async (showLoading = true) => {
    if (!courierId) {
      setLoading(false);
      return false;
    }

    try {
      // Only update loading state if we're not refreshing and if showLoading is true
      if (showLoading && !isRefreshing) {
        setLoading(true);
      }
      
      setError(null);
      
      // Fetch orders assigned to the current courier with restaurant details
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          restaurants (
            name,
            address,
            lat,
            lng
          )
        `)
        .eq('courier_id', courierId)
        .in('status', ['picked_up', 'on_the_way']);

      if (ordersError) {
        console.error("Error fetching active orders:", ordersError);
        setError("Failed to load active orders");
        throw ordersError;
      }

      if (ordersData) {
        const formattedOrders = ordersData.map(order => {
          const restaurantData = order.restaurants as unknown as RestaurantData;
          
          // Parse items if needed
          const parsedItems = typeof order.items === 'string' 
            ? JSON.parse(order.items as string) 
            : (Array.isArray(order.items) ? order.items : []);
            
          return {
            ...order,
            items: parsedItems,
            restaurant_name: restaurantData?.name || 'Unknown Restaurant',
            restaurant_address: restaurantData?.address || 'Unknown Address',
            restaurant_lat: restaurantData?.lat || 0,
            restaurant_lng: restaurantData?.lng || 0,
            delivery_pin: order.delivery_pin || '' // Ensure delivery_pin is included
          } as ActiveOrder;
        });
        setActiveOrders(formattedOrders);
      }

      // Fetch all restaurants for map display
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*');

      if (restaurantError) {
        console.error("Error fetching restaurants:", restaurantError);
        setError("Failed to load restaurants");
      } else {
        setRestaurants(restaurantData || []);
      }

      // Fetch reviewers if needed - only if we have reviews
      if (reviews.length > 0) {
        const reviewerIds = reviews.map(review => review.user_id);
        const { data: reviewersData, error: reviewersError } = await supabase
          .from('users')
          .select('id, name')
          .in('id', reviewerIds);
        
        if (reviewersError) {
          console.error("Error fetching reviewers:", reviewersError);
          setError("Failed to load reviewers");
        } else if (reviewersData) {
          setReviewers(reviewersData as SimpleUser[]);
        }
      }
      
      return true;
    } catch (error) {
      console.error("Error in useCourierActiveOrders:", error);
      setError("An unexpected error occurred");
      return false;
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      initCompletedRef.current = true;
    }
  }, [courierId, reviews.length, isRefreshing]);

  const refetch = useCallback(async () => {
    setIsRefreshing(true);
    return fetchActiveOrders(false);
  }, [fetchActiveOrders]);

  useEffect(() => {
    if (!courierId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    
    const loadInitialData = async () => {
      if (isMounted && !initCompletedRef.current) {
        await fetchActiveOrders();
        if (isMounted) {
          await refetchReviews();
        }
      }
    };
    
    loadInitialData();
    
    // Set up interval to refresh data
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && isMounted && !isRefreshing) {
        refetch();
      }
    }, 60000); // refresh every minute when visible
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [courierId, fetchActiveOrders, refetchReviews, refetch, isRefreshing]);

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)
        .eq('courier_id', courierId);

      if (error) {
        console.error("Error updating order status:", error);
        toast({
          title: "Error",
          description: "Could not update order status",
          variant: "destructive",
        });
        return false;
      } else {
        toast({
          title: "Success",
          description: `Order status updated to ${newStatus}`,
        });

        // Optimistically update the local state
        setActiveOrders(prevOrders =>
          prevOrders.map(order =>
            order.id === orderId ? { ...order, status: newStatus } : order
          )
        );
        
        // If the order is delivered, it should no longer be in the active orders
        if (newStatus === 'delivered') {
          await refetch();
        }
        
        return true;
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    activeOrders,
    restaurants,
    reviews,
    reviewers,
    averageRating,
    loading: loading || reviewsLoading,
    error,
    updateOrderStatus,
    refetch
  };
}
