
import { apiClient } from '../client';
import { Order, OrderStatus } from '@/lib/database.types';
import { mqttClient } from '@/lib/mqtt-client';

// Cache for orders data
const ordersCache = {
  byId: new Map<string, { data: Order; timestamp: number }>(),
  byUser: new Map<string, { data: Order[]; timestamp: number }>(),
  byRestaurant: new Map<string, { data: Order[]; timestamp: number }>(),
  byCourier: new Map<string, { data: Order[]; timestamp: number }>(),
  byStatus: new Map<string, { data: Order[]; timestamp: number }>(),
};

// Cache TTL in milliseconds (2 minutes)
const CACHE_TTL = 2 * 60 * 1000;

// WebSocket subscribers tracking
const subscribers = new Set<(order: Order) => void>();

export const orderApi = {
  getOrderById: async (id: string) => {
    console.log(`Fetching order by ID: ${id}`);
    
    // Check cache first
    const cachedOrder = ordersCache.byId.get(id);
    const now = Date.now();
    
    if (cachedOrder && (now - cachedOrder.timestamp < CACHE_TTL)) {
      console.log(`Using cached order data for ID: ${id}`);
      return cachedOrder.data;
    }
    
    try {
      const response = await apiClient.get(`/orders/${id}`);
      console.log(`Order ${id} fetched successfully:`, response.data);
      
      // Update cache
      ordersCache.byId.set(id, { data: response.data, timestamp: now });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching order by ID:', error);
      throw error;
    }
  },

  getOrdersByUser: async (userId: string) => {
    console.log(`Fetching orders for user: ${userId}`);
    
    // Check cache first
    const cachedOrders = ordersCache.byUser.get(userId);
    const now = Date.now();
    
    if (cachedOrders && (now - cachedOrders.timestamp < CACHE_TTL)) {
      console.log(`Using cached orders data for user: ${userId}`);
      return cachedOrders.data;
    }
    
    try {
      const response = await apiClient.get(`/orders/user/${userId}`);
      console.log(`Received ${response.data?.length || 0} orders for user ${userId}`);
      
      // Update cache
      ordersCache.byUser.set(userId, { data: response.data, timestamp: now });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching user orders:', error);
      throw error;
    }
  },

  getOrdersByRestaurant: async (restaurantId: string, forceRefresh = false) => {
    console.log(`Fetching orders for restaurant: ${restaurantId}, force refresh: ${forceRefresh}`);
    
    // Check cache first if not forcing refresh
    if (!forceRefresh) {
      const cachedOrders = ordersCache.byRestaurant.get(restaurantId);
      const now = Date.now();
      
      if (cachedOrders && (now - cachedOrders.timestamp < CACHE_TTL)) {
        console.log(`Using cached orders data for restaurant: ${restaurantId}`);
        return cachedOrders.data;
      }
    }
    
    try {
      // Add a timestamp to avoid caching issues, but only if forcing refresh
      const timestamp = forceRefresh ? new Date().getTime() : '';
      const queryParam = forceRefresh ? `?t=${timestamp}` : '';
      
      const response = await apiClient.get(`/orders/restaurant/${restaurantId}${queryParam}`);
      console.log(`Received ${response.data?.length || 0} orders for restaurant ${restaurantId}`);
      console.log('Restaurant orders data sample:', response.data?.slice(0, 2));
      
      // Process orders to ensure items are properly formatted
      const processedOrders = (response.data || []).map(order => {
        let parsedItems = [];
        
        try {
          if (typeof order.items === 'string') {
            parsedItems = JSON.parse(order.items);
          } else if (Array.isArray(order.items)) {
            parsedItems = order.items;
          } else if (order.items && typeof order.items === 'object') {
            // If it's already a JSON object but not an array
            parsedItems = [order.items];
          }
        } catch (e) {
          console.error(`Error parsing items for order ${order.id}:`, e);
        }
        
        return {
          ...order,
          items: parsedItems
        };
      });
      
      // Update cache
      ordersCache.byRestaurant.set(restaurantId, { 
        data: processedOrders, 
        timestamp: Date.now() 
      });
      
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
    const cachedOrders = ordersCache.byCourier.get(courierId);
    const now = Date.now();
    
    if (cachedOrders && (now - cachedOrders.timestamp < CACHE_TTL)) {
      console.log(`Using cached orders data for courier: ${courierId}`);
      return cachedOrders.data;
    }
    
    try {
      const response = await apiClient.get(`/orders/courier/${courierId}`);
      console.log(`Received ${response.data?.length || 0} orders for courier ${courierId}`);
      
      // Update cache
      ordersCache.byCourier.set(courierId, { data: response.data, timestamp: now });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching courier orders:', error);
      throw error;
    }
  },

  getOrdersByStatus: async (status: OrderStatus | OrderStatus[]) => {
    const statusParam = Array.isArray(status) ? status.join(',') : status;
    console.log(`Fetching orders with status: ${statusParam}`);
    
    // Check cache first
    const cachedOrders = ordersCache.byStatus.get(statusParam);
    const now = Date.now();
    
    if (cachedOrders && (now - cachedOrders.timestamp < CACHE_TTL)) {
      console.log(`Using cached orders data for status: ${statusParam}`);
      return cachedOrders.data;
    }
    
    try {
      const response = await apiClient.get(`/orders/status/${statusParam}`);
      console.log(`Received ${response.data?.length || 0} orders with status ${statusParam}`);
      
      // Update cache
      ordersCache.byStatus.set(statusParam, { data: response.data, timestamp: now });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching orders by status:', error);
      throw error;
    }
  },

  createOrder: async (orderData: Omit<Order, 'id' | 'created_at' | 'updated_at' | 'status'>) => {
    try {
      console.log('Creating new order with data:', JSON.stringify(orderData));
      const response = await apiClient.post('/orders', orderData);
      console.log('Order creation response:', response.data);
      
      // Clear relevant caches to ensure fresh data on next fetch
      ordersCache.byUser.delete(orderData.user_id);
      ordersCache.byRestaurant.delete(orderData.restaurant_id);
      
      // Notify over MQTT
      if (mqttClient) {
        mqttClient.publish(`foodapp/restaurants/${orderData.restaurant_id}/orders`, JSON.stringify(response.data));
      }
      
      // Notify subscribers
      subscribers.forEach(callback => callback(response.data));
      
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
      
      const updatedOrder = response.data;
      
      // Update cache for this specific order
      const order = ordersCache.byId.get(orderId);
      if (order) {
        order.data.status = status;
        ordersCache.byId.set(orderId, { ...order, timestamp: Date.now() });
      }
      
      // Clear other caches as they might contain this order
      ordersCache.byUser.clear();
      ordersCache.byRestaurant.clear();
      ordersCache.byCourier.clear();
      ordersCache.byStatus.clear();
      
      // Notify over MQTT
      if (mqttClient) {
        const topic = `foodapp/orders/${orderId}/status`;
        mqttClient.publish(topic, JSON.stringify({
          orderId,
          status,
          timestamp: new Date().toISOString()
        }));
        
        if (updatedOrder.restaurant_id) {
          mqttClient.publish(`foodapp/restaurants/${updatedOrder.restaurant_id}/orders/updated`, JSON.stringify(updatedOrder));
        }
      }
      
      // Notify subscribers
      subscribers.forEach(callback => callback(updatedOrder));
      
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
      
      // Update cache for this specific order
      const order = ordersCache.byId.get(orderId);
      if (order) {
        order.data.courier_id = courierId;
        ordersCache.byId.set(orderId, { ...order, timestamp: Date.now() });
      }
      
      // Clear other caches as they might contain this order
      ordersCache.byUser.clear();
      ordersCache.byRestaurant.clear();
      ordersCache.byCourier.clear();
      ordersCache.byStatus.clear();
      
      // Notify over MQTT
      if (mqttClient) {
        mqttClient.publish(`foodapp/couriers/${courierId}/assignments`, JSON.stringify({
          orderId,
          timestamp: new Date().toISOString()
        }));
      }
      
      // Notify subscribers
      subscribers.forEach(callback => callback(response.data));
      
      return response.data;
    } catch (error) {
      console.error('Error assigning courier:', error);
      throw error;
    }
  },

  // Clear all caches or specific caches
  clearCache: (type?: 'byId' | 'byUser' | 'byRestaurant' | 'byCourier' | 'byStatus', key?: string) => {
    if (!type) {
      Object.values(ordersCache).forEach(cache => {
        if (cache instanceof Map) {
          cache.clear();
        }
      });
      console.log('All order caches cleared');
      return;
    }
    
    if (key && ordersCache[type].has(key)) {
      ordersCache[type].delete(key);
      console.log(`Cache cleared for ${type} with key ${key}`);
    } else if (!key) {
      if (ordersCache[type] instanceof Map) {
        (ordersCache[type] as Map<string, any>).clear();
      }
      console.log(`All ${type} caches cleared`);
    }
  },

  subscribeToOrderUpdates: (callback: (updatedOrder: Order) => void) => {
    // Add the callback to subscribers
    subscribers.add(callback);
    
    // Also subscribe via MQTT for real-time updates
    if (mqttClient) {
      mqttClient.subscribe('foodapp/orders/events/#');
    }
    
    // Return an unsubscribe function
    return () => {
      subscribers.delete(callback);
    };
  }
};
