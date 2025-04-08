
import { Order, OrderStatus } from '@/lib/database.types';

/**
 * Check if an order is in a current (active) state
 */
export const isCurrentOrder = (status: OrderStatus): boolean => {
  return !['delivered', 'completed', 'cancelled'].includes(status);
};

/**
 * Status display mapping for human-readable status labels
 */
export const ORDER_STATUS_DISPLAY: Record<OrderStatus, string> = {
  created: 'Created',
  accepted_by_restaurant: 'Accepted by Restaurant',
  preparing: 'Preparing',
  ready_for_pickup: 'Ready for Pickup',
  picked_up: 'Picked Up',
  on_the_way: 'On the Way',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

/**
 * If an order has not been updated for a certain time,
 * consider it stale and auto-update the status.
 */
export const isStaleOrder = (order: Order): boolean => {
  const updatedDate = new Date(order.updated_at);
  const now = new Date();
  // 45 minutes with no update = stale
  const timeDiffInMinutes = (now.getTime() - updatedDate.getTime()) / (1000 * 60);
  
  return timeDiffInMinutes > 45 && isCurrentOrder(order.status);
};

/**
 * Process a list of orders and update status of stale orders
 */
export const processStaleOrders = (orders: Order[]): Order[] => {
  return orders.map(order => {
    if (isStaleOrder(order)) {
      if (['created', 'accepted_by_restaurant', 'preparing'].includes(order.status)) {
        return { ...order, status: 'ready_for_pickup' };
      } else if (['ready_for_pickup', 'picked_up', 'on_the_way'].includes(order.status)) {
        return { ...order, status: 'delivered' };
      }
    }
    return order;
  });
};

/**
 * Get appropriate next status for an order based on current status
 */
export const getNextOrderStatus = (currentStatus: OrderStatus): OrderStatus | null => {
  switch (currentStatus) {
    case 'created':
      return 'accepted_by_restaurant';
    case 'accepted_by_restaurant':
      return 'preparing';
    case 'preparing':
      return 'ready_for_pickup';
    case 'ready_for_pickup':
      return 'picked_up';
    case 'picked_up':
      return 'on_the_way';
    case 'on_the_way':
      return 'delivered';
    case 'delivered':
      return 'completed';
    default:
      return null;
  }
};

/**
 * Check if a status can be moved to the next status by the given user type
 */
export const canUpdateToNextStatus = (
  currentStatus: OrderStatus,
  userType: string
): boolean => {
  if (userType === 'employee') return true;
  
  switch (currentStatus) {
    case 'created':
    case 'accepted_by_restaurant':
    case 'preparing':
    case 'ready_for_pickup':
      return userType === 'restaurant';
    case 'picked_up':
    case 'on_the_way':
    case 'delivered':
      return userType === 'courier';
    default:
      return false;
  }
};

/**
 * Get all valid statuses the order can be updated to
 */
export const getValidStatusUpdates = (
  currentStatus: OrderStatus,
  userType: string
): OrderStatus[] => {
  // Employee can set any status
  if (userType === 'employee') {
    return [
      'created',
      'accepted_by_restaurant',
      'preparing',
      'ready_for_pickup',
      'picked_up',
      'on_the_way',
      'delivered',
      'completed',
      'cancelled'
    ];
  }
  
  // Restaurant can only set restaurant-related statuses
  if (userType === 'restaurant') {
    if (['created', 'accepted_by_restaurant', 'preparing'].includes(currentStatus)) {
      return [
        'accepted_by_restaurant',
        'preparing',
        'ready_for_pickup'
      ];
    }
  }
  
  // Courier can only set delivery-related statuses
  if (userType === 'courier') {
    if (['ready_for_pickup', 'picked_up', 'on_the_way'].includes(currentStatus)) {
      return [
        'picked_up',
        'on_the_way',
        'delivered'
      ];
    }
  }
  
  return [];
};
