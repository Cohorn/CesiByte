
import { Order, OrderStatus } from '@/lib/database.types';

// Check if an order is stale (older than 45 mins with no status update)
export const isStaleOrder = (order: Order): boolean => {
  const updatedAt = new Date(order.updated_at);
  const now = new Date();
  const diffInMinutes = (now.getTime() - updatedAt.getTime()) / (1000 * 60);
  
  // Consider an order stale if it's been more than 45 minutes since last update
  // and the order is not in a completed or delivered state
  return diffInMinutes > 45 && 
    !['delivered', 'completed'].includes(order.status);
};

// Convert distance in kilometers to travel time in minutes assuming 20km/h speed
export const distanceToTime = (distanceKm: number): number => {
  // Speed: 20 km/h = 0.333 km/min
  const speedKmPerMin = 20 / 60;
  
  // Calculate time in minutes
  return Math.round(distanceKm / speedKmPerMin);
};

// Check if an order is in a current/active state
export const isCurrentOrder = (status: OrderStatus): boolean => {
  return ['created', 'accepted_by_restaurant', 'preparing', 'ready_for_pickup', 'picked_up', 'on_the_way'].includes(status);
};

// Process orders to mark stale ones
export const processStaleOrders = (orders: Order[]): Order[] => {
  return orders.map(order => {
    if (isStaleOrder(order) && isCurrentOrder(order.status)) {
      // Create a copy with updated status for display purposes
      // This doesn't actually update the database
      return {
        ...order,
        status: 'completed' as OrderStatus,
        _wasStale: true // Optional marker to know it was auto-completed
      };
    }
    return order;
  });
};
