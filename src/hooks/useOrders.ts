
import { useState, useEffect, useCallback } from 'react';
import { orderApi } from '@/api/services/orderService';
import { Order, OrderStatus } from '@/lib/database.types';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { mqttClient } from '@/lib/mqtt-client';

interface OrdersOptions {
  userId?: string;
  restaurantId?: string;
  courierId?: string;
  status?: OrderStatus | OrderStatus[];
}

export const useOrders = (options: OrdersOptions = {}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasFetched, setHasFetched] = useState<boolean>(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Determine which API method to use based on the options
  const fetchOrders = useCallback(async (forceRefresh: boolean = false) => {
    // Skip fetching if we don't have the necessary IDs
    if (!options.restaurantId && !options.userId && !options.courierId && !options.status && !user) {
      console.log('No user or specific ID provided for fetching orders');
      setIsLoading(false);
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      let fetchedOrders: Order[] = [];

      // Check if we have a restaurant ID and prioritize that for fetching
      if (options.restaurantId) {
        console.log(`Fetching orders for restaurant ID: ${options.restaurantId}, force: ${forceRefresh}`);
        fetchedOrders = await orderApi.getOrdersByRestaurant(options.restaurantId, forceRefresh);
      } else if (options.userId) {
        console.log(`Fetching orders for user ID: ${options.userId}`);
        fetchedOrders = await orderApi.getOrdersByUser(options.userId);
      } else if (options.courierId) {
        console.log(`Fetching orders for courier ID: ${options.courierId}`);
        fetchedOrders = await orderApi.getOrdersByCourier(options.courierId);
      } else if (options.status) {
        console.log(`Fetching orders by status: ${options.status}`);
        fetchedOrders = await orderApi.getOrdersByStatus(options.status);
      } else if (user) {
        // Default to current user's orders if no specific option is provided
        console.log(`Fetching orders for current user: ${user.id}`);
        fetchedOrders = await orderApi.getOrdersByUser(user.id);
      }

      console.log(`Fetched ${fetchedOrders?.length || 0} orders`);
      
      // Update state with fetched orders
      setOrders(fetchedOrders || []);
      setHasFetched(true);
      setIsLoading(false);
      return fetchedOrders || [];
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError(err instanceof Error ? err : new Error('Failed to fetch orders'));
      
      toast({
        title: "Error",
        description: "Could not fetch orders",
        variant: "destructive"
      });
      
      setIsLoading(false);
      return [];
    }
  }, [options.userId, options.restaurantId, options.courierId, options.status, user, toast]);

  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus) => {
    try {
      const result = await orderApi.updateOrderStatus(orderId, status);
      
      // Success handling
      toast({
        title: "Status Updated",
        description: `Order status has been updated to ${status.replace(/_/g, ' ')}`,
      });

      // Update local state without refetching
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status, updated_at: new Date().toISOString() } : order
        )
      );
      
      return { success: true, data: result };
    } catch (err) {
      console.error("Error updating order status:", err);
      
      // Error handling
      toast({
        title: "Update Failed",
        description: "Could not update the order status",
        variant: "destructive"
      });
      
      return { success: false, error: err };
    }
  }, [toast]);

  // Update the verifyDeliveryPin function
  const verifyDeliveryPin = useCallback(async (orderId: string, pin: string) => {
    try {
      console.log(`Attempting to verify PIN for order ${orderId}`);
      const result = await orderApi.verifyDeliveryPin(orderId, pin);
      
      if (result.success) {
        console.log('PIN verification succeeded');
        // Update local state without refetching
        if (result.order) {
          setOrders(prevOrders => 
            prevOrders.map(order => 
              order.id === orderId ? result.order : order
            )
          );
        }
        
        return { success: true, data: result.order };
      } else {
        console.log('PIN verification failed:', result.message);
        return { success: false, message: result.message };
      }
    } catch (err: any) {
      console.error("Error verifying delivery PIN:", err);
      // Provide more detailed error information
      const errorMessage = err.response?.data?.error || err.message || "Error processing your request";
      return { success: false, message: errorMessage };
    }
  }, []);

  // Initial fetch - better dependency tracking
  useEffect(() => {
    // Only fetch if we have some relevant ID to fetch by
    const hasRelevantId = options.restaurantId || options.courierId || options.userId || user?.id;
    
    if (!hasFetched && hasRelevantId) {
      console.log('useOrders hook - initial fetch with options:', options);
      fetchOrders()
        .then(result => {
          console.log('Initial orders fetch complete, count:', result.length);
        })
        .catch(err => {
          console.error('Error in initial orders fetch:', err);
        });
    }
  }, [
    options.restaurantId, 
    options.courierId, 
    options.userId,
    user?.id,
    fetchOrders, 
    hasFetched
  ]);

  // Subscribe to real-time updates
  useEffect(() => {
    console.log('Setting up real-time order updates subscription');
    
    // Set up MQTT subscriptions for real-time updates
    if (mqttClient && (options.restaurantId || options.userId || options.courierId)) {
      const topics = [];
      
      if (options.restaurantId) {
        const topic = `foodapp/restaurants/${options.restaurantId}/orders/#`;
        topics.push(topic);
        console.log(`Subscribing to restaurant orders: ${topic}`);
        mqttClient.subscribe(topic);
      }
      
      if (options.userId) {
        const topic = `foodapp/users/${options.userId}/orders/#`;
        topics.push(topic);
        console.log(`Subscribing to user orders: ${topic}`);
        mqttClient.subscribe(topic);
      }
      
      if (options.courierId) {
        const topic = `foodapp/couriers/${options.courierId}/assignments`;
        topics.push(topic);
        console.log(`Subscribing to courier assignments: ${topic}`);
        mqttClient.subscribe(topic);
      }
      
      // Subscribe to order update events to trigger refreshes
      const updateTopic = 'foodapp/orders/events/updated';
      topics.push(updateTopic);
      mqttClient.subscribe(updateTopic);
      
      // Return cleanup function
      return () => {
        topics.forEach(topic => {
          console.log(`Unsubscribing from: ${topic}`);
          mqttClient.unsubscribe(topic);
        });
      };
    }
    
    // Subscribe to order updates via the orderApi
    const unsubscribe = orderApi.subscribeToOrderUpdates((updatedOrder) => {
      console.log('Received order update:', updatedOrder);
      
      // Check if this update is relevant to our current filter
      let isRelevant = false;
      
      if (options.restaurantId && updatedOrder.restaurant_id === options.restaurantId) {
        isRelevant = true;
      } else if (options.userId && updatedOrder.user_id === options.userId) {
        isRelevant = true;
      } else if (options.courierId && updatedOrder.courier_id === options.courierId) {
        isRelevant = true;
      } else if (options.status) {
        const statusArray = Array.isArray(options.status) ? options.status : [options.status];
        if (statusArray.includes(updatedOrder.status)) {
          isRelevant = true;
        }
      }
      
      if (isRelevant) {
        // Update local state without refetching
        setOrders(prevOrders => {
          const orderExists = prevOrders.some(order => order.id === updatedOrder.id);
          
          if (orderExists) {
            // Update existing order
            return prevOrders.map(order => 
              order.id === updatedOrder.id ? updatedOrder : order
            );
          } else {
            // Add new order
            return [updatedOrder, ...prevOrders];
          }
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [options.restaurantId, options.userId, options.courierId, options.status]);

  return {
    orders,
    isLoading,
    error,
    refetch: fetchOrders,
    updateOrderStatus,
    verifyDeliveryPin
  };
};
