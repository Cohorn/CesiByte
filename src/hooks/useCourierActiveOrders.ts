
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Order, OrderStatus, SimpleUser } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';
import { useReviews } from '@/hooks/useReviews';

interface ActiveOrder extends Order {
  restaurant_name: string;
  restaurant_address: string;
  restaurant_lat: number;
  restaurant_lng: number;
}

interface RestaurantData {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export function useCourierActiveOrders(courierId?: string) {
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [reviewers, setReviewers] = useState<SimpleUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { reviews, refetch: refetchReviews } = useReviews({ courierId });

  useEffect(() => {
    if (!courierId) {
      setLoading(false);
      return;
    }

    const fetchActiveOrders = async () => {
      setLoading(true);
      try {
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
          toast({
            title: "Error",
            description: "Failed to load active orders",
            variant: "destructive",
          });
          setLoading(false);
          return;
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
        } else {
          setRestaurants(restaurantData || []);
        }

        // Fetch reviewers if needed
        if (reviews.length > 0) {
          const reviewerIds = reviews.map(review => review.user_id);
          const { data: reviewersData } = await supabase
            .from('users')
            .select('id, name')
            .in('id', reviewerIds);
          
          if (reviewersData) {
            setReviewers(reviewersData as SimpleUser[]);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error in useCourierActiveOrders:", error);
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive",
        });
        setLoading(false);
      }
    };

    fetchActiveOrders();
    refetchReviews();
    
    // Set up interval to refresh data
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchActiveOrders();
      }
    }, 60000); // refresh every minute when visible
    
    return () => clearInterval(interval);
  }, [courierId, toast, refetchReviews, reviews.length]);

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
    loading,
    updateOrderStatus
  };
}
