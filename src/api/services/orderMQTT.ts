
import { mqttClient } from '@/lib/mqtt-client';
import { Order } from '@/lib/database.types';

// WebSocket subscribers tracking
const subscribers = new Set<(order: Order) => void>();

export const orderMQTTService = {
  // Publish order events via MQTT
  publishOrderEvent: (topic: string, data: any) => {
    if (mqttClient && mqttClient.isConnected()) {
      console.log(`Publishing to ${topic}:`, data);
      mqttClient.publish(topic, JSON.stringify(data));
      return true;
    }
    return false;
  },
  
  // Subscribe to order updates
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
  },
  
  // Notify subscribers about order updates
  notifySubscribers: (order: Order) => {
    subscribers.forEach(callback => {
      try {
        callback(order);
      } catch (error) {
        console.error('Error in order update subscriber callback:', error);
      }
    });
  }
};
