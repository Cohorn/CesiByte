
import { Order, OrderStatus } from '@/lib/database.types';

// Constants for order processing
const STALE_ORDER_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const DELIVERY_SPEED_KM_H = 20; // Average delivery speed in km/h

// Check if an order is considered "current" based on its status
export const isCurrentOrder = (status: OrderStatus): boolean => {
  const currentOrderStatuses: OrderStatus[] = [
    'pending',
    'confirmed',
    'preparing',
    'ready_for_pickup',
    'picked_up',
    'out_for_delivery',
  ];
  
  return currentOrderStatuses.includes(status);
};

// Check if an order is considered "stale" based on its last update time
export const isStaleOrder = (order: Order): boolean => {
  const lastUpdated = new Date(order.updated_at).getTime();
  const now = Date.now();
  
  // Order is stale if it's in an active state but hasn't been updated in 24 hours
  return isCurrentOrder(order.status) && (now - lastUpdated > STALE_ORDER_THRESHOLD);
};

// Process orders to mark stale ones with a special flag
export const processStaleOrders = (orders: Order[]): Order[] => {
  return orders.map(order => {
    if (isStaleOrder(order)) {
      // Create a copy with the stale flag for UI purposes
      return {
        ...order,
        isStale: true,
      };
    }
    return order;
  });
};

// Calculate estimated delivery time based on distance in kilometers
export const distanceToTime = (distanceKm: number): number => {
  if (!distanceKm || distanceKm <= 0) return 0;
  
  // Convert distance to time in minutes
  // Time = Distance / Speed * 60 (minutes)
  return Math.ceil((distanceKm / DELIVERY_SPEED_KM_H) * 60);
};

// Export any other order utility functions that might be needed
