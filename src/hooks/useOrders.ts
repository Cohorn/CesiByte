
import { useState, useEffect, useCallback } from 'react';
import { orderApi } from '@/api/services/orderService';
import { Order, OrderStatus } from '@/lib/database.types';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { mqttClient } from '@/lib/mqtt-client';
import { notificationService } from '@/services/notificationService';
import { generateOrderStatusNotification } from '@/utils/notificationUtils';

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
  const [retryCount, setRetryCount] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchOrders = useCallback(async (forceRefresh: boolean = false) => {
    if ((!options.restaurantId && !options.userId && !options.courierId && !options.status && !user) || !localStorage.getItem('auth_token')) {
      console.log('No user, auth token, or specific ID provided for fetching orders');
      setIsLoading(false);
      return [];
    }

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
      } else if (options.courierId && options.status) {
        console.log(`Fetching orders for courier ID: ${options.courierId} with status: ${options.status}`);
        
        try {
          // First try using the getOrdersByStatus method and then filter
          console.log('Trying to fetch by status first...');
          const allOrdersWithStatus = await orderApi.getOrdersByStatus(options.status);
          
          // Filter orders by courier ID
          fetchedOrders = allOrdersWithStatus.filter(order => order.courier_id === options.courierId);
          console.log(`Filtered to ${fetchedOrders.length} orders for courier ${options.courierId}`);
        } catch (err) {
          console.error("Error fetching orders by status for courier:", err);
          
          // Fallback: Get all courier orders and filter by status client-side
          console.log('Falling back to getting all courier orders and filtering by status');
          const allCourierOrders = await orderApi.getOrdersByCourier(options.courierId);
          
          const statusArray = Array.isArray(options.status) ? options.status : [options.status];
          fetchedOrders = allCourierOrders.filter(order => statusArray.includes(order.status));
          
          console.log(`Fallback: Filtered to ${fetchedOrders.length} orders for courier ${options.courierId}`);
        }
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
      
      setOrders(fetchedOrders || []);
      setHasFetched(true);
      setIsLoading(false);
      setRetryCount(0); // Reset retry count on successful fetch
      return fetchedOrders || [];
    } catch (err: any) {
      console.error("Error fetching orders:", err);
      setError(err instanceof Error ? err : new Error(err.message || 'Failed to fetch orders'));
      
      // Don't show a toast for every retry attempt
      if (retryCount === 0) {
        toast({
          title: "Error",
          description: "Could not fetch orders. You can try again using the retry button.",
          variant: "destructive"
        });
      }
      
      setIsLoading(false);
      setRetryCount(prev => prev + 1);
      return [];
    }
  }, [options.userId, options.restaurantId, options.courierId, options.status, user, toast, retryCount]);

  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus) => {
    try {
      const result = await orderApi.updateOrderStatus(orderId, status);
      
      toast({
        title: "Status Updated",
        description: `Order status has been updated to ${status.replace(/_/g, ' ')}`,
      });

      // Create relevant notifications for all parties involved
      if (user) {
        // Access the updated order correctly
        const updatedOrder = result && result.data ? result.data : orders.find(o => o.id === orderId);
        
        if (updatedOrder) {
          // For customer notification
          if (updatedOrder.user_id && updatedOrder.user_id !== user.id) {
            const { title, message } = generateOrderStatusNotification(status, 'customer');
            notificationService.addNotification({
              id: crypto.randomUUID(),
              user_id: updatedOrder.user_id,
              title,
              message,
              is_read: false,
              created_at: new Date().toISOString(),
              type: 'order',
              related_id: orderId
            });
          }
          
          // For restaurant notification (if we're a courier)
          if (user.user_type === 'courier' && updatedOrder.restaurant_id) {
            const { title, message } = generateOrderStatusNotification(status, 'restaurant');
            notificationService.addNotification({
              id: crypto.randomUUID(),
              user_id: updatedOrder.restaurant_id,
              title,
              message,
              is_read: false,
              created_at: new Date().toISOString(),
              type: 'order',
              related_id: orderId
            });
          }
          
          // For courier notification (if we're a restaurant)
          if (user.user_type === 'restaurant' && updatedOrder.courier_id) {
            const { title, message } = generateOrderStatusNotification(status, 'courier');
            notificationService.addNotification({
              id: crypto.randomUUID(),
              user_id: updatedOrder.courier_id,
              title,
              message,
              is_read: false,
              created_at: new Date().toISOString(),
              type: 'order',
              related_id: orderId
            });
          }
        }
      }

      fetchOrders(true);
      
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
  }, [fetchOrders, toast, user, orders]);

  const assignCourier = useCallback(async (orderId: string, courierId: string) => {
    try {
      const result = await orderApi.assignCourier(orderId, courierId);
      
      fetchOrders(true);
      
      return { success: true, data: result };
    } catch (err) {
      console.error("Error assigning courier:", err);
      return { success: false, error: err };
    }
  }, [fetchOrders]);

  const verifyDeliveryPin = useCallback(async (orderId: string, pin: string) => {
    try {
      console.log(`Sending verification request for order ${orderId} with PIN ${pin}`);
      const result = await orderApi.verifyDeliveryPin(orderId, pin);
      
      if (result.success) {
        toast({
          title: "Delivery Confirmed",
          description: "PIN verified successfully. Delivery completed!"
        });
        
        fetchOrders(true);
      } else {
        toast({
          title: "Verification Failed",
          description: result.message || "Invalid PIN provided",
          variant: "destructive"
        });
      }
      
      return result;
    } catch (err: any) {
      console.error("Error verifying delivery PIN:", err);
      
      toast({
        title: "Verification Error",
        description: "An error occurred during PIN verification",
        variant: "destructive"
      });
      
      return { 
        success: false, 
        message: err.message || "Verification failed" 
      };
    }
  }, [fetchOrders, toast]);

  useEffect(() => {
    const hasRelevantId = options.restaurantId || options.courierId || options.userId || user?.id;
    const isAuthenticated = !!localStorage.getItem('auth_token');
    
    if (!hasFetched && hasRelevantId && isAuthenticated) {
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
        setOrders(currentOrders => {
          const orderIndex = currentOrders.findIndex(order => order.id === updatedOrder.id);
          
          if (orderIndex >= 0) {
            const newOrders = [...currentOrders];
            newOrders[orderIndex] = updatedOrder;
            return newOrders;
          } else {
            return [updatedOrder, ...currentOrders];
          }
        });
        
        // Generate a notification for relevant order updates
        if (user) {
          const { title, message } = generateOrderStatusNotification(
            updatedOrder.status, 
            user.user_type
          );
          
          notificationService.addNotification({
            id: crypto.randomUUID(),
            user_id: user.id,
            title,
            message,
            is_read: false,
            created_at: new Date().toISOString(),
            type: 'order',
            related_id: updatedOrder.id
          });
        }
      }
    });

    return () => {
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
      
      unsubscribe();
    };
  }, [options.restaurantId, options.userId, options.courierId, options.status, user]);

  return {
    orders,
    isLoading,
    error,
    refetch: fetchOrders,
    updateOrderStatus,
    assignCourier,
    verifyDeliveryPin,
    retryCount
  };
};
