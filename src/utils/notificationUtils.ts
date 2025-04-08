
import { Notification, OrderStatus, UserType } from '@/lib/database.types';

/**
 * Generate notification title and message based on order status change
 */
export const generateOrderStatusNotification = (
  status: OrderStatus,
  userType: UserType,
  restaurantName?: string
): { title: string; message: string } => {
  let title = "Order Update";
  let message = "Your order status has been updated.";

  switch (status) {
    case 'accepted_by_restaurant':
      title = "Order Accepted";
      message = userType === 'customer' 
        ? `Great news! ${restaurantName || 'The restaurant'} has accepted your order.`
        : "You have accepted a new order.";
      break;
    case 'preparing':
      title = "Order Preparation";
      message = userType === 'customer'
        ? `${restaurantName || 'The restaurant'} is now preparing your food.`
        : "You've started preparing an order.";
      break;
    case 'ready_for_pickup':
      title = "Order Ready for Pickup";
      message = userType === 'customer'
        ? "Your order is ready and waiting for a courier."
        : userType === 'courier'
          ? "An order is ready for pickup!"
          : "Order is ready for courier pickup.";
      break;
    case 'picked_up':
      title = "Order Picked Up";
      message = userType === 'customer'
        ? "A courier has picked up your order and is on the way."
        : userType === 'courier'
          ? "You've successfully picked up the order."
          : "A courier has picked up the order.";
      break;
    case 'on_the_way':
      title = "Order On The Way";
      message = userType === 'customer'
        ? "Your order is on the way to you!"
        : userType === 'courier'
          ? "You're on the way to deliver the order."
          : "The order is being delivered.";
      break;
    case 'delivered':
      title = "Order Delivered";
      message = userType === 'customer'
        ? "Your order has been delivered. Enjoy!"
        : userType === 'courier'
          ? "You've successfully delivered the order."
          : "The order has been delivered.";
      break;
    case 'completed':
      title = "Order Completed";
      message = "The order has been completed successfully.";
      break;
    default:
      // Use default values
      break;
  }

  return { title, message };
};

/**
 * Create notification objects for system-wide events
 */
export const createSystemNotification = (
  userId: string, 
  title: string, 
  message: string
): Notification => {
  return {
    id: crypto.randomUUID(),
    user_id: userId,
    title,
    message,
    is_read: false,
    created_at: new Date().toISOString(),
    type: 'system'
  };
};

/**
 * Create notification for referral events
 */
export const createReferralNotification = (
  userId: string,
  referrerName: string
): Notification => {
  return {
    id: crypto.randomUUID(),
    user_id: userId,
    title: "New Referral",
    message: `${referrerName} has referred you to our platform. Welcome!`,
    is_read: false,
    created_at: new Date().toISOString(),
    type: 'referral'
  };
};
