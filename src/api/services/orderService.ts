
// This is a simplified version for demonstration
import { apiClient } from '../client';
import { Order, OrderStatus } from '@/lib/database.types';
import { orderCacheService } from './orderCache';
import { mqttClient } from '@/lib/mqtt-client';
import { calculateEstimatedDeliveryTime } from '@/utils/deliveryTimeUtils';

// Import order data processor functions
import { processOrders, processOrderItems } from './orderDataProcessor';

// Event listeners for order updates
const orderUpdateCallbacks: ((order: Order) => void)[] = [];

export const orderApi = {
  getOrdersByUser: async (userId: string): Promise<Order[]> => {
    try {
      // Check cache first
      const cachedOrders = orderCacheService.getCached('byUser', userId);
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
        const cachedOrders = orderCacheService.getCached('byRestaurant', restaurantId);
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
  
  getOrdersByCourier: async (courierId: string, status?: OrderStatus | OrderStatus[]): Promise<Order[]> => {
    try {
      // Create a cache key
      let cacheKey = courierId;
      if (status) {
        const statusStr = Array.isArray(status) ? status.join(',') : status;
        cacheKey = `${courierId}:${statusStr}`;
      }
      
      // Check cache first
      const cachedOrders = orderCacheService.getCached('byCourier', cacheKey);
      if (cachedOrders) return cachedOrders;

      // Use the new query endpoint if status is provided
      let response;
      if (status) {
        // Convert status to string format for the query
        const statusStr = Array.isArray(status) ? status.join(',') : status;
        console.log(`Fetching courier orders with status filter: ${statusStr}`);
        
        try {
          // First try the query endpoint which is more flexible
          response = await apiClient.get('/orders/query', {
            params: {
              courier_id: courierId,
              status: statusStr
            }
          });
          console.log(`Successfully fetched ${response.data.length} courier orders with status from query endpoint`);
        } catch (queryError) {
          console.error('Error using query endpoint:', queryError);
          
          // Fallback to the courier-specific endpoint with status parameter
          console.log('Falling back to courier endpoint with status parameter');
          response = await apiClient.get(`/orders/courier/${courierId}`, {
            params: {
              status: statusStr
            }
          });
          console.log(`Successfully fetched ${response.data.length} courier orders with status from courier endpoint`);
        }
      } else {
        // No status filter, use the standard endpoint
        response = await apiClient.get(`/orders/courier/${courierId}`);
      }
      
      const orders = processOrders(response.data);
      
      // Cache the results
      orderCacheService.setCache('byCourier', cacheKey, orders);
      
      return orders;
    } catch (error) {
      console.error('Error fetching courier orders:', error);
      console.error('Error details:', error.response?.data || error.message);
      
      // Return empty array instead of throwing to provide graceful degradation
      return [];
    }
  },
  
  getOrdersByStatus: async (status: OrderStatus | OrderStatus[] | 'all'): Promise<Order[]> => {
    // Create a cache key based on the status(es)
    const statusArray = status === 'all' ? [] : Array.isArray(status) ? status : [status];
    const cacheKey = status === 'all' ? 'all' : statusArray.join(',');
    
    try {
      // Check cache first
      const cachedOrders = orderCacheService.getCached('byStatus', cacheKey);
      if (cachedOrders) return cachedOrders;

      let url = '/orders';
      
      if (status !== 'all') {
        // Handle array of statuses by using query parameters
        if (Array.isArray(status)) {
          // Convert status array to query string format
          const statusParams = status.map(s => `status=${s}`).join('&');
          url = `/orders/status?${statusParams}`;
        } else {
          // Single status - use the simpler path format
          url = `/orders/status/${status}`;
        }
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
      if (status !== 'all' && Array.isArray(status) && error.response?.status === 400) {
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
      // Add estimated delivery time if restaurant and delivery locations are available
      if (orderData.restaurant_id && orderData.delivery_lat != null && orderData.delivery_lng != null) {
        // Get restaurant location from backend
        try {
          const restaurantResponse = await apiClient.get(`/restaurants/${orderData.restaurant_id}`);
          const restaurant = restaurantResponse.data;
          
          if (restaurant && restaurant.lat != null && restaurant.lng != null) {
            orderData.estimated_delivery_time = calculateEstimatedDeliveryTime(
              restaurant.lat,
              restaurant.lng,
              orderData.delivery_lat,
              orderData.delivery_lng
            );
            console.log('Estimated delivery time calculated:', orderData.estimated_delivery_time);
          }
        } catch (error) {
          console.error('Error fetching restaurant for delivery time calculation:', error);
          // Continue without estimated time if fetch fails
        }
      }
      
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
      orderCacheService.clearCache();
      
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
      orderCacheService.clearCache();
      
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
      orderCacheService.clearCache();
      
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
  mqttClient.subscribe(`foodapp/orders/events/#`, (message) => {
    try {
      if (message && typeof message === 'object') {
        const orderData = message.order || message;
        if (orderData && orderData.id) {
          // Process and notify subscribers
          const processedOrder = processOrderItems(orderData);
          orderApi.notifyOrderUpdate(processedOrder);
          
          // Clear relevant caches
          orderCacheService.clearCache();
        }
      }
    } catch (error) {
      console.error('Error processing MQTT order update:', error);
    }
  });
}
