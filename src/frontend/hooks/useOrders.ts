
import { useState, useEffect, useCallback } from 'react';
import { orderApi } from '@/api/services/orderService';
import { Order, OrderStatus } from '@/lib/database.types';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

// MQTT WebSocket library would be imported here in a production app
// For the prototype, we'll continue using existing Socket.IO setup
/*
import mqtt from 'mqtt';

// Webosocket MQTT connection (typically would connect to the MQTT broker's WebSocket endpoint)
const createMqttClient = () => {
  return mqtt.connect('ws://api-gateway:9001');
};
*/

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

  // Determine which API method to use based on the options
  const fetchOrders = useCallback(async (forceRefresh: boolean = false) => {
    setIsLoading(true);

    try {
      let fetchedOrders: Order[] = [];

      if (options.userId) {
        fetchedOrders = await orderApi.getOrdersByUser(options.userId);
      } else if (options.restaurantId) {
        fetchedOrders = await orderApi.getOrdersByRestaurant(options.restaurantId, forceRefresh);
      } else if (options.courierId) {
        fetchedOrders = await orderApi.getOrdersByCourier(options.courierId);
      } else if (options.status) {
        fetchedOrders = await orderApi.getOrdersByStatus(options.status);
      } else if (user) {
        // Default to current user's orders if no specific option is provided
        fetchedOrders = await orderApi.getOrdersByUser(user.id);
      }

      // Update state with fetched orders
      setOrders(fetchedOrders || []);
      setError(null);
      return fetchedOrders || [];
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError(err instanceof Error ? err : new Error('Failed to fetch orders'));
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [options.userId, options.restaurantId, options.courierId, options.status, user]);

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
  }, [fetchOrders]);

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
    if (user || options.restaurantId || options.courierId) {
      fetchOrders();
    }
  }, [user, options.restaurantId, options.courierId, fetchOrders]);

  // Real-time updates using Socket.IO for now
  // In a production app, we would use MQTT over WebSockets here
  useEffect(() => {
    /* 
    // This would be MQTT implementation for production
    const client = createMqttClient();
    
    client.on('connect', () => {
      console.log('Connected to MQTT broker');
      
      // Subscribe to relevant topics based on options
      if (options.userId) {
        client.subscribe(`foodapp/users/${options.userId}/orders/#`);
      }
      
      if (options.restaurantId) {
        client.subscribe(`foodapp/restaurants/${options.restaurantId}/orders`);
      }
      
      if (options.courierId) {
        client.subscribe(`foodapp/couriers/${options.courierId}/assignments`);
      }
      
      // Always subscribe to status updates for orders we know about
      for (const order of orders) {
        client.subscribe(`foodapp/orders/${order.id}/status`);
      }
    });
    
    client.on('message', (topic, message) => {
      const data = JSON.parse(message.toString());
      
      if (topic.includes('/orders/') && topic.endsWith('/status')) {
        // Handle status updates
        // Update local state
        setOrders(prev => prev.map(order => 
          order.id === data.orderId ? { ...order, status: data.status } : order
        ));
      } else if (topic.endsWith('/orders')) {
        // Handle new orders
        // Add to local state if relevant
        setOrders(prev => [data, ...prev]);
      }
    });
    
    return () => {
      client.end();
    };
    */
    
    // Subscribe to order updates
    const unsubscribe = orderApi.subscribeToOrderUpdates((updatedOrder) => {
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
    });

    return () => {
      unsubscribe();
    };
  }, [options.userId, options.restaurantId, options.courierId, orders]);

  return {
    orders,
    isLoading,
    error,
    refetch: fetchOrders,
    updateOrderStatus,
    assignCourier
  };
};
