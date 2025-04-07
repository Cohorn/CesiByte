import { useState, useEffect, useCallback, useRef } from 'react';
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
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchOrders = useCallback(async (forceRefresh: boolean = false) => {
    if (!options.restaurantId && !options.userId && !options.courierId && !options.status && !user) {
      console.log('No user or specific ID provided for fetching orders');
      if (isMounted.current) {
        setIsLoading(false);
      }
      return [];
    }

    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.log('No auth token available, skipping order fetch');
      if (isMounted.current) {
        setIsLoading(false);
        setError(new Error('Authentication required'));
      }
      return [];
    }

    if (isMounted.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      let fetchedOrders: Order[] = [];

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
        console.log(`Fetching orders for current user: ${user.id}`);
        fetchedOrders = await orderApi.getOrdersByUser(user.id);
      }

      console.log(`Fetched ${fetchedOrders?.length || 0} orders`);
      
      if (isMounted.current) {
        setOrders(fetchedOrders || []);
        setHasFetched(true);
        setIsLoading(false);
      }
      return fetchedOrders || [];
    } catch (err) {
      console.error("Error fetching orders:", err);
      
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch orders'));
        
        toast({
          title: "Error",
          description: "Could not fetch orders",
          variant: "destructive"
        });
        
        setIsLoading(false);
      }
      return [];
    }
  }, [options.userId, options.restaurantId, options.courierId, options.status, user, toast]);

  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus) => {
    try {
      const result = await orderApi.updateOrderStatus(orderId, status);
      
      toast({
        title: "Status Updated",
        description: `Order status has been updated to ${status.replace(/_/g, ' ')}`,
      });

      if (isMounted.current) {
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId ? { ...order, status, updated_at: new Date().toISOString() } : order
          )
        );
      }
      
      return { success: true, data: result };
    } catch (err) {
      console.error("Error updating order status:", err);
      
      toast({
        title: "Update Failed",
        description: "Could not update the order status",
        variant: "destructive"
      });
      
      return { success: false, error: err };
    }
  }, [toast]);

  const assignCourier = useCallback(async (orderId: string, courierId: string) => {
    try {
      const result = await orderApi.assignCourier(orderId, courierId);
      
      toast({
        title: "Courier Assigned",
        description: `Courier ${courierId} has been assigned to order ${orderId}`,
      });

      if (isMounted.current) {
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId ? { ...order, courier_id: courierId } : order
          )
        );
      }
      
      return { success: true, data: result };
    } catch (err) {
      console.error("Error assigning courier:", err);
      
      toast({
        title: "Assignment Failed",
        description: "Could not assign the courier",
        variant: "destructive"
      });
      
      return { success: false, error: err };
    }
  }, [toast]);

  const verifyDeliveryPin = useCallback(async (orderId: string, pin: string) => {
    try {
      console.log(`Sending verification request for order ${orderId} with PIN ${pin}`);
      return await orderApi.verifyDeliveryPin(orderId, pin);
    } catch (err) {
      console.error("Error in verifyDeliveryPin:", err);
      return { 
        success: false, 
        message: err instanceof Error ? err.message : "Error processing your request" 
      };
    }
  }, []);

  useEffect(() => {
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

  useEffect(() => {
    console.log('Setting up real-time order updates subscription');
    
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
      
      const updateTopic = 'foodapp/orders/events/updated';
      topics.push(updateTopic);
      mqttClient.subscribe(updateTopic);
      
      return () => {
        topics.forEach(topic => {
          console.log(`Unsubscribing from: ${topic}`);
          mqttClient.unsubscribe(topic);
        });
      };
    }
    
    const unsubscribe = orderApi.subscribeToOrderUpdates((updatedOrder) => {
      console.log('Received order update:', updatedOrder);
      
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
        setOrders(prevOrders => {
          const orderExists = prevOrders.some(order => order.id === updatedOrder.id);
          
          if (orderExists) {
            return prevOrders.map(order => 
              order.id === updatedOrder.id ? updatedOrder : order
            );
          } else {
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
    assignCourier,
    verifyDeliveryPin
  };
};
