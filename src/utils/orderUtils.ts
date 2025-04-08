
import { OrderStatus, Order } from '@/lib/database.types';

export const isCurrentOrder = (status: OrderStatus): boolean => {
  const currentOrderStatuses: OrderStatus[] = [
    'created',
    'accepted_by_restaurant',
    'preparing',
    'ready_for_pickup',
    'picked_up',
    'on_the_way'
  ];
  
  return currentOrderStatuses.includes(status);
};

export const orderStatusLabels: Record<OrderStatus, string> = {
  'created': 'Created',
  'accepted_by_restaurant': 'Accepted',
  'preparing': 'Preparing',
  'ready_for_pickup': 'Ready for Pickup',
  'picked_up': 'Picked Up',
  'on_the_way': 'On the Way',
  'delivered': 'Delivered',
  'completed': 'Completed'
};

export const getNextOrderStatuses = (currentStatus: OrderStatus): OrderStatus[] => {
  switch (currentStatus) {
    case 'created':
      return ['accepted_by_restaurant'];
    case 'accepted_by_restaurant':
      return ['preparing'];
    case 'preparing':
      return ['ready_for_pickup'];
    case 'ready_for_pickup':
      return ['picked_up'];
    case 'picked_up':
      return ['on_the_way'];
    case 'on_the_way':
      return ['delivered'];
    case 'delivered':
      return ['completed'];
    case 'completed':
      return [];
    default:
      return [];
  }
};

// Check if an order is stale (not updated for 45 minutes)
export const isStaleOrder = (order: Order): boolean => {
  // If order is already completed or delivered, it's not stale
  if (order.status === 'completed' || order.status === 'delivered') {
    return false;
  }
  
  // Calculate time difference in minutes
  const updatedAt = new Date(order.updated_at);
  const now = new Date();
  const diffInMinutes = (now.getTime() - updatedAt.getTime()) / (1000 * 60);
  
  // Order is stale if it hasn't been updated in 45 minutes
  return diffInMinutes >= 45;
};

// Process orders to mark stale ones as cancelled/completed
export const processStaleOrders = (orders: Order[]): Order[] => {
  return orders.map(order => {
    if (isStaleOrder(order)) {
      return {
        ...order,
        status: 'completed', // Mark stale orders as completed
      };
    }
    return order;
  });
};
