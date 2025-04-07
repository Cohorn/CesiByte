
import { Order, OrderStatus } from '@/lib/database.types';

// Constants for time thresholds
export const PREPARATION_TIMEOUT_MINUTES = 90;
export const DELIVERY_TIMEOUT_MINUTES = 90;

/**
 * Calculate time remaining before an order is auto-canceled
 * @param order The order to check
 * @returns Minutes remaining before cancellation, or null if not applicable
 */
export const getTimeRemainingBeforeCancel = (order: Order): number | null => {
  // If order is already delivered, completed, or canceled, no auto-cancel applies
  if (['delivered', 'completed', 'canceled'].includes(order.status)) {
    return null;
  }
  
  const createdAt = new Date(order.created_at);
  const now = new Date();
  const elapsedMinutes = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));
  
  // For pre-preparation statuses (created, accepted_by_restaurant)
  if (['created', 'accepted_by_restaurant'].includes(order.status)) {
    const remainingMinutes = PREPARATION_TIMEOUT_MINUTES - elapsedMinutes;
    return remainingMinutes > 0 ? remainingMinutes : 0;
  }
  
  // For post-preparation but pre-delivery statuses
  if (['preparing', 'ready_for_pickup', 'picked_up', 'on_the_way'].includes(order.status)) {
    const remainingMinutes = DELIVERY_TIMEOUT_MINUTES - elapsedMinutes;
    return remainingMinutes > 0 ? remainingMinutes : 0;
  }
  
  return null;
};

/**
 * Check if an order should be auto-canceled based on time thresholds
 */
export const shouldAutoCancel = (order: Order): boolean => {
  const remainingTime = getTimeRemainingBeforeCancel(order);
  return remainingTime !== null && remainingTime <= 0;
};

/**
 * Format the remaining time as a human-readable string
 */
export const formatRemainingTime = (minutes: number): string => {
  if (minutes <= 0) {
    return "Time expired";
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${mins}m remaining`;
  } else {
    return `${mins}m remaining`;
  }
};

/**
 * Get the effective order status, considering auto-cancellation rules
 */
export const getEffectiveOrderStatus = (order: Order): OrderStatus => {
  if (shouldAutoCancel(order)) {
    return 'canceled';
  }
  return order.status as OrderStatus;
};
