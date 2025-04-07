
import { useState, useEffect, useCallback } from 'react';
import { orderApi } from '@/api/services/orderService';
import { Order, OrderStatus } from '@/lib/database.types';
import { useAuth } from './useAuth';
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
  const { user } = useAuth();
  const { toast } = useToast();

  // Determine which API method to use based on the options
  const fetchOrders = useCallback(async (forceRefresh: boolean = false) => {
    setIsLoading(true);
    setError(null);

    try {
      let fetchedOrders: Order[] = [];

      if (options.userId) {
        console.log(`Fetching orders for user ID: ${options.userId}`);
        fetchedOrders = await orderApi.getOrdersByUser(options.userId);
      } else if (options.restaurantId) {
        console.log(`Fetching orders for restaurant ID: ${options.restaurantId}, force: ${forceRefresh}`);
        fetchedOrders = await orderApi.getOrdersByRestaurant(options.restaurantId, forceRefresh);
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
      return fetchedOrders || [];
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError(err instanceof Error ? err : new Error('Failed to fetch orders'));
      
      toast({
        title: "Error",
        description: "Could not fetch orders",
        variant: "destructive"
      });
      
      return [];
    } finally {
      setIsLoading(false);
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

      // Fetch latest orders after update
      fetchOrders(true);
      
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
  }, [fetchOrders, toast]);

  const assignCourier = useCallback(async (orderId: string, courierId: string) => {
    try {
      const result = await orderApi.assignCourier(orderId, courierId);
      
      // Fetch latest orders after assignment
      fetchOrders(true);
      
      return { success: true, data: result };
    } catch (err) {
      console.error("Error assigning courier:", err);
      return { success: false, error: err };
    }
  }, [fetchOrders]);

  // Initial fetch
  useEffect(() => {
    console.log('useOrders hook - initial fetch with options:', options);
    if (user || options.restaurantId || options.courierId) {
      fetchOrders();
    }
  }, [user, options.restaurantId, options.courierId, fetchOrders]);

  // Subscribe to real-time updates
  useEffect(() => {
    console.log('Setting up real-time order updates subscription');
    
    // Set up MQTT subscriptions
    if (mqttClient && (options.restaurantId || options.userId || options.courierId)) {
      if (options.restaurantId) {
        console.log(`Subscribing to restaurant orders: ${options.restaurantId}`);
        mqttClient.subscribe(`foodapp/restaurants/${options.restaurantId}/orders/#`);
      }
      
      if (options.userId) {
        console.log(`Subscribing to user orders: ${options.userId}`);
        mqttClient.subscribe(`foodapp/users/${options.userId}/orders/#`);
      }
      
      if (options.courierId) {
        console.log(`Subscribing to courier assignments: ${options.courierId}`);
        mqttClient.subscribe(`foodapp/couriers/${options.courierId}/assignments`);
      }
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
        setOrders(currentOrders => {
          // Check if we already have this order
          const orderIndex = currentOrders.findIndex(order => order.id === updatedOrder.id);
          
          if (orderIndex >= 0) {
            // Update existing order
            const newOrders = [...currentOrders];
            newOrders[orderIndex] = updatedOrder;
            return newOrders;
          } else {
            // Add new order
            return [updatedOrder, ...currentOrders];
          }
        });
      }
    });

    return () => {
      // Clean up MQTT subscriptions
      if (mqttClient) {
        if (options.restaurantId) {
          mqttClient.unsubscribe(`foodapp/restaurants/${options.restaurantId}/orders/#`);
        }
        
        if (options.userId) {
          mqttClient.unsubscribe(`foodapp/users/${options.userId}/orders/#`);
        }
        
        if (options.courierId) {
          mqttClient.unsubscribe(`foodapp/couriers/${options.courierId}/assignments`);
        }
      }
      
      // Unsubscribe from order updates
      unsubscribe();
    };
  }, [options.restaurantId, options.userId, options.courierId, options.status]);

  return {
    orders,
    isLoading,
    error,
    refetch: fetchOrders,
    updateOrderStatus,
    assignCourier
  };
};
