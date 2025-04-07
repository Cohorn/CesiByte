
import { OrderStatus } from '@/lib/database.types';
import { getEffectiveOrderStatus } from './orderTimeUtils';

export const isCurrentOrder = (status: OrderStatus): boolean => {
  // Orders are considered "current" if they're not delivered, completed, or canceled
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

// This function checks if an order should be displayed in the "current" tab
export const isDisplayedAsCurrentOrder = (order: any): boolean => {
  const effectiveStatus = getEffectiveOrderStatus(order);
  return isCurrentOrder(effectiveStatus);
};

export const orderStatusLabels: Record<OrderStatus, string> = {
  'created': 'Created',
  'accepted_by_restaurant': 'Accepted',
  'preparing': 'Preparing',
  'ready_for_pickup': 'Ready for Pickup',
  'picked_up': 'Picked Up',
  'on_the_way': 'On the Way',
  'delivered': 'Delivered',
  'completed': 'Completed',
  'canceled': 'Canceled'
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
    case 'canceled':
      return [];
    default:
      return [];
  }
};
