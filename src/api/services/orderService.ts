// This is a simplified version for demonstration
import { apiClient } from '../client';
import { Order, OrderStatus } from '@/lib/database.types';
import { mqttClient } from '@/lib/mqtt-client';
import { orderCacheService } from './orderCache';
import { processOrderItems, processOrders } from './orderDataProcessor';
import { orderMQTTService } from './orderMQTT';

// Helper to generate a random PIN
const generatePin = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

export const orderApi = {
  getOrderById: async (id: string) => {
    console.log(`Fetching order by ID: ${id}`);
    
    // Check cache first
    const cachedOrder = orderCacheService.getCached('byId', id);
    if (cachedOrder) return cachedOrder;
    
    try {
      const response = await apiClient.get(`/orders/${id}`);
      console.log(`Order ${id} fetched successfully:`, response.data);
      
      const processedOrder = processOrderItems(response.data);
      
      // Update cache
      orderCacheService.setCache('byId', id, processedOrder);
      
      return processedOrder;
    } catch (error) {
      console.error('Error fetching order by ID:', error);
      throw error;
    }
  },

  getOrdersByUser: async (userId: string) => {
    console.log(`Fetching orders for user: ${userId}`);
    
    // Check cache first
    const cachedOrders = orderCacheService.getCached('byUser', userId);
    if (cachedOrders) return cachedOrders;
    
    try {
      const response = await apiClient.get(`/orders/user/${userId}`);
      console.log(`Received ${response.data?.length || 0} orders for user ${userId}`);
      
      const processedOrders = processOrders(response.data);
      
      // Update cache
      orderCacheService.setCache('byUser', userId, processedOrders);
      
      return processedOrders;
    } catch (error) {
      console.error('Error fetching user orders:', error);
      throw error;
    }
  },

  getOrdersByRestaurant: async (restaurantId: string, forceRefresh = false) => {
    console.log(`Fetching orders for restaurant: ${restaurantId}, force refresh: ${forceRefresh}`);
    
    // Check cache first if not forcing refresh
    if (!forceRefresh) {
      const cachedOrders = orderCacheService.getCached('byRestaurant', restaurantId);
      if (cachedOrders) return cachedOrders;
    }
    
    try {
      // Add a timestamp to avoid caching issues, but only if forcing refresh
      const timestamp = forceRefresh ? new Date().getTime() : '';
      const queryParam = forceRefresh ? `?t=${timestamp}` : '';
      
      const response = await apiClient.get(`/orders/restaurant/${restaurantId}${queryParam}`);
      console.log(`Received ${response.data?.length || 0} orders for restaurant ${restaurantId}`);
      
      const processedOrders = processOrders(response.data);
      
      // Update cache
      orderCacheService.setCache('byRestaurant', restaurantId, processedOrders);
      
      return processedOrders;
    } catch (error) {
      console.error('Error fetching restaurant orders:', error);
      console.error('Error details:', error.response?.data || error.message);
      throw error;
    }
  },

  getOrdersByCourier: async (courierId: string) => {
    console.log(`Fetching orders for courier: ${courierId}`);
    
    // Check cache first
    const cachedOrders = orderCacheService.getCached('byCourier', courierId);
    if (cachedOrders) return cachedOrders;
    
    try {
      const response = await apiClient.get(`/orders/courier/${courierId}`);
      console.log(`Received ${response.data?.length || 0} orders for courier ${courierId}`);
      
      const processedOrders = processOrders(response.data);
      
      // Update cache
      orderCacheService.setCache('byCourier', courierId, processedOrders);
      
      return processedOrders;
    } catch (error) {
      console.error('Error fetching courier orders:', error);
      throw error;
    }
  },

  getOrdersByStatus: async (status: OrderStatus | OrderStatus[]) => {
    const statusParam = Array.isArray(status) ? status.join(',') : status;
    console.log(`Fetching orders with status: ${statusParam}`);
    
    // Check cache first
    const cachedOrders = orderCacheService.getCached('byStatus', statusParam);
    if (cachedOrders) return cachedOrders;
    
    try {
      const response = await apiClient.get(`/orders/status/${statusParam}`);
      console.log(`Received ${response.data?.length || 0} orders with status ${statusParam}`);
      
      const processedOrders = processOrders(response.data);
      
      // Update cache
      orderCacheService.setCache('byStatus', statusParam, processedOrders);
      
      return processedOrders;
    } catch (error) {
      console.error('Error fetching orders by status:', error);
      throw error;
    }
  },

  createOrder: async (orderData: Omit<Order, 'id' | 'created_at' | 'updated_at' | 'status' | 'delivery_pin'>) => {
    try {
      console.log('Creating new order with data:', JSON.stringify(orderData));
      
      // Generate a 4-digit PIN for delivery confirmation
      const deliveryPin = generatePin();
      
      const response = await apiClient.post('/orders', {
        ...orderData,
        delivery_pin: deliveryPin
      });
      
      console.log('Order creation response:', response.data);
      
      // Clear relevant caches to ensure fresh data on next fetch
      orderCacheService.clearCache('byUser', orderData.user_id);
      orderCacheService.clearCache('byRestaurant', orderData.restaurant_id);
      
      // Notify over MQTT
      orderMQTTService.publishOrderEvent(
        `foodapp/restaurants/${orderData.restaurant_id}/orders`, 
        response.data
      );
      
      // Notify subscribers
      orderMQTTService.notifySubscribers(response.data);
      
      return response.data;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  },

  updateOrderStatus: async (orderId: string, status: OrderStatus) => {
    try {
      console.log(`Updating order ${orderId} status to ${status}`);
      const response = await apiClient.put(`/orders/${orderId}/status`, { status });
      console.log('Order status update response:', response.data);
      
      const updatedOrder = processOrderItems(response.data);
      
      // Clear caches to ensure fresh data
      orderCacheService.clearCache();
      
      // Notify over MQTT
      orderMQTTService.publishOrderEvent(
        `foodapp/orders/${orderId}/status`, 
        {
          orderId,
          status,
          timestamp: new Date().toISOString()
        }
      );
      
      if (updatedOrder.restaurant_id) {
        orderMQTTService.publishOrderEvent(
          `foodapp/restaurants/${updatedOrder.restaurant_id}/orders/updated`, 
          updatedOrder
        );
      }
      
      // Notify subscribers
      orderMQTTService.notifySubscribers(updatedOrder);
      
      return updatedOrder;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  },

  assignCourier: async (orderId: string, courierId: string) => {
    try {
      console.log(`Assigning courier ${courierId} to order ${orderId}`);
      const response = await apiClient.put(`/orders/${orderId}/courier`, { courier_id: courierId });
      console.log('Courier assignment response:', response.data);
      
      const updatedOrder = processOrderItems(response.data);
      
      // Clear caches to ensure fresh data
      orderCacheService.clearCache();
      
      // Notify over MQTT
      orderMQTTService.publishOrderEvent(
        `foodapp/couriers/${courierId}/assignments`, 
        {
          orderId,
          timestamp: new Date().toISOString()
        }
      );
      
      // Notify subscribers
      orderMQTTService.notifySubscribers(updatedOrder);
      
      return updatedOrder;
    } catch (error) {
      console.error('Error assigning courier:', error);
      throw error;
    }
  },

  verifyDeliveryPin: async (orderId: string, pin: string) => {
    try {
      console.log(`Verifying delivery PIN for order ${orderId} with pin ${pin}`);
      
      // Fix the endpoint path - the proper path should be /orders/:orderId/verify-pin
      const response = await apiClient.post(`/orders/${orderId}/verify-pin`, { pin });
      console.log('PIN verification API response:', response.data);
      
      if (response.data.success) {
        console.log('PIN verified successfully, order marked as delivered');
        
        // Clear caches to ensure fresh data
        orderCacheService.clearCache();
        
        // Notify over MQTT
        const updatedOrder = processOrderItems(response.data.order);
        
        orderMQTTService.publishOrderEvent(
          `foodapp/orders/${orderId}/status`, 
          {
            orderId,
            status: 'delivered',
            timestamp: new Date().toISOString()
          }
        );
        
        if (updatedOrder?.restaurant_id) {
          orderMQTTService.publishOrderEvent(
            `foodapp/restaurants/${updatedOrder.restaurant_id}/orders/updated`, 
            updatedOrder
          );
        }
        
        // Notify subscribers
        orderMQTTService.notifySubscribers(updatedOrder);
        
        return {
          success: true,
          order: updatedOrder
        };
      } else {
        console.error('PIN verification failed:', response.data.message);
        return {
          success: false,
          message: response.data.message || 'Invalid PIN'
        };
      }
    } catch (error: any) {
      console.error('Error verifying delivery PIN:', error);
      
      // Extract the error message from the response if possible
      const errorMessage = 
        error.response?.data?.error || 
        error.response?.data?.message || 
        error.message || 
        'Error processing your request';
      
      console.log('Detailed error info:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        method: error.config?.method,
        responseData: error.response?.data
      });
      
      return {
        success: false,
        message: errorMessage
      };
    }
  },

  clearCache: orderCacheService.clearCache,
  
  subscribeToOrderUpdates: orderMQTTService.subscribeToOrderUpdates
};
