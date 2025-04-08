
// This is a simplified version for demonstration
import { apiClient } from '../client';
import { Order, OrderStatus } from '@/lib/database.types';
import { orderCacheService } from './orderCache';
import { orderDataProcessor } from './orderDataProcessor';
import { mqttClient } from '@/lib/mqtt-client';

// Event listeners for order updates
const orderUpdateCallbacks: ((order: Order) => void)[] = [];

// Process orders from API response
const processOrders = (data: any[]): Order[] => {
  if (!data || !Array.isArray(data)) return [];
  return orderDataProcessor.processOrdersData(data);
};

export const orderApi = {
  getOrdersByUser: async (userId: string): Promise<Order[]> => {
    try {
      // Check cache first
      const cachedOrders = orderCacheService.getCache('byUser', userId);
      if (cachedOrders) return cachedOrders;

      const response = await apiClient.get(`/orders/user/${userId}`);
      const orders = processOrders(response.data);
      
      // Cache the results
      orderCacheService.setCache('byUser', userId, orders);
      
      return orders;
    } catch (error) {
      console.error('Error fetching user orders:', error);
      throw error;
    }
  },
  
  getOrdersByRestaurant: async (restaurantId: string, forceRefresh = false): Promise<Order[]> => {
    try {
      // Check cache first if not forcing refresh
      if (!forceRefresh) {
        const cachedOrders = orderCacheService.getCache('byRestaurant', restaurantId);
        if (cachedOrders) return cachedOrders;
      }

      const response = await apiClient.get(`/orders/restaurant/${restaurantId}`);
      const orders = processOrders(response.data);
      
      // Cache the results
      orderCacheService.setCache('byRestaurant', restaurantId, orders);
      
      return orders;
    } catch (error) {
      console.error('Error fetching restaurant orders:', error);
      throw error;
    }
  },
  
  getOrdersByCourier: async (courierId: string): Promise<Order[]> => {
    try {
      // Check cache first
      const cachedOrders = orderCacheService.getCache('byCourier', courierId);
      if (cachedOrders) return cachedOrders;

      const response = await apiClient.get(`/orders/courier/${courierId}`);
      const orders = processOrders(response.data);
      
      // Cache the results
      orderCacheService.setCache('byCourier', courierId, orders);
      
      return orders;
    } catch (error) {
      console.error('Error fetching courier orders:', error);
      throw error;
    }
  },
  
  getOrdersByStatus: async (status: OrderStatus | OrderStatus[]): Promise<Order[]> => {
    // Create a cache key based on the status(es)
    const statusArray = Array.isArray(status) ? status : [status];
    const cacheKey = statusArray.join(',');
    
    try {
      // Check cache first
      const cachedOrders = orderCacheService.getCache('byStatus', cacheKey);
      if (cachedOrders) return cachedOrders;

      let url = '/orders/status';
      
      // Handle array of statuses by using query parameters
      if (Array.isArray(status)) {
        // Convert status array to query string format
        const statusParams = status.map(s => `status=${s}`).join('&');
        url = `/orders/status?${statusParams}`;
        console.log(`Fetching orders with multiple statuses: ${url}`);
      } else {
        // Single status - use the simpler path format
        url = `/orders/status/${status}`;
        console.log(`Fetching orders with single status: ${url}`);
      }

      const response = await apiClient.get(url);
      const orders = processOrders(response.data);
      
      // Cache the results
      orderCacheService.setCache('byStatus', cacheKey, orders);
      
      return orders;
    } catch (error) {
      console.error('Error fetching orders by status:', error);
      console.error('Error details:', error.response?.data || error.message);
      
      // If the backend doesn't support the query parameter format,
      // try fetching all orders and filter client-side as a fallback
      if (Array.isArray(status) && error.response?.status === 400) {
        console.log('Falling back to fetching all orders and filtering client-side');
        try {
          const allOrdersResponse = await apiClient.get('/orders');
          const allOrders = processOrders(allOrdersResponse.data);
          const filteredOrders = allOrders.filter(order => 
            statusArray.includes(order.status as OrderStatus)
          );
          
          // Cache the results
          orderCacheService.setCache('byStatus', cacheKey, filteredOrders);
          
          return filteredOrders;
        } catch (fallbackError) {
          console.error('Error in fallback order fetch:', fallbackError);
          throw fallbackError;
        }
      }
      
      throw error;
    }
  },
  
  createOrder: async (orderData: Partial<Order>): Promise<Order> => {
    try {
      const response = await apiClient.post('/orders', orderData);
      return response.data;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  },
  
  updateOrderStatus: async (orderId: string, status: OrderStatus): Promise<Order> => {
    try {
      const response = await apiClient.put(`/orders/${orderId}/status`, { status });
      
      // Clear any cached data when an order is updated
      orderCacheService.clearAllCaches();
      
      return response.data;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  },
  
  assignCourier: async (orderId: string, courierId: string): Promise<Order> => {
    try {
      const response = await apiClient.put(`/orders/${orderId}/courier`, { courier_id: courierId });
      
      // Clear any cached data when a courier is assigned
      orderCacheService.clearAllCaches();
      
      return response.data;
    } catch (error) {
      console.error('Error assigning courier:', error);
      throw error;
    }
  },
  
  verifyDeliveryPin: async (orderId: string, pin: string): Promise<{ success: boolean, message?: string }> => {
    try {
      const response = await apiClient.post(`/orders/${orderId}/verify-pin`, { pin });
      
      // Clear any cached data when delivery is verified
      orderCacheService.clearAllCaches();
      
      return response.data;
    } catch (error) {
      console.error('Error verifying delivery PIN:', error);
      
      // Extract error message if available
      const errorMessage = error.response?.data?.message || 'PIN verification failed';
      return { success: false, message: errorMessage };
    }
  },
  
  subscribeToOrderUpdates: (callback: (order: Order) => void) => {
    orderUpdateCallbacks.push(callback);
    
    // Return an unsubscribe function
    return () => {
      const index = orderUpdateCallbacks.indexOf(callback);
      if (index !== -1) {
        orderUpdateCallbacks.splice(index, 1);
      }
    };
  },
  
  // Internal function to notify subscribers of order updates
  notifyOrderUpdate: (order: Order) => {
    orderUpdateCallbacks.forEach(callback => {
      try {
        callback(order);
      } catch (error) {
        console.error('Error in order update callback:', error);
      }
    });
  }
};

// Set up MQTT event handling if client is available
if (mqttClient) {
  // Subscribe to order updates from MQTT
  mqttClient.onMessage((topic, message) => {
    if (topic.includes('/orders/')) {
      try {
        const orderData = JSON.parse(message);
        if (orderData && orderData.id) {
          // Process and notify subscribers
          const processedOrder = orderDataProcessor.processSingleOrder(orderData);
          orderApi.notifyOrderUpdate(processedOrder);
          
          // Clear relevant caches
          orderCacheService.clearCacheForOrder(processedOrder);
        }
      } catch (error) {
        console.error('Error processing MQTT order update:', error);
      }
    }
  });
}
