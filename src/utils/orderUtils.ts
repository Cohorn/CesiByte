
import { Order } from '@/lib/database.types';

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

// Check if an order is a current/active order
export const isCurrentOrder = (status: string): boolean => {
  return ['pending', 'preparing', 'ready_for_pickup', 'picked_up', 'on_the_way'].includes(status);
};

// Process a list of orders to handle stale ones
export const processStaleOrders = (orders: Order[]): Order[] => {
  if (!orders || orders.length === 0) return [];
  
  return orders.map(order => {
    // For display purposes, mark stale orders as completed
    if (isStaleOrder(order)) {
      return {
        ...order,
        status: 'completed',
        statusChanged: true
      };
    }
    return order;
  });
};
