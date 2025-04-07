
import { mqttClient } from '@/lib/mqtt-client';
import { Order } from '@/lib/database.types';

export const notificationService = {
  // Notify a user about an order update
  notifyOrderStatusUpdate: (order: Order, oldStatus?: string) => {
    if (!order.user_id) return false;
    
    const statusMap: Record<string, string> = {
      pending: 'Pending',
      accepted_by_restaurant: 'Accepted by Restaurant',
      preparing: 'Being Prepared',
      ready_for_pickup: 'Ready for Pickup',
      picked_up: 'Picked Up',
      in_delivery: 'In Delivery',
      delivered: 'Delivered',
      completed: 'Completed',
      cancelled: 'Cancelled'
    };

    const formattedStatus = statusMap[order.status] || order.status;
    const orderId = order.id?.substring(0, 8) || 'Unknown';
    
    const message = {
      title: `Order Status Update`,
      message: `Your order #${orderId} status has changed to ${formattedStatus}`,
      data: {
        orderId: order.id,
        oldStatus,
        newStatus: order.status
      }
    };

    // Publish to user's notification channel
    console.log(`Publishing order update notification to user ${order.user_id}`);
    return mqttClient.publish(`foodapp/users/${order.user_id}/notifications`, message);
  },

  // Notify a restaurant about a new order
  notifyNewOrder: (order: Order) => {
    if (!order.restaurant_id) return false;
    
    console.log(`Publishing new order notification to restaurant ${order.restaurant_id}`);
    return mqttClient.publish(`foodapp/restaurants/${order.restaurant_id}/orders`, order);
  },

  // Notify couriers about a new order available for pickup
  notifyOrderAvailableForPickup: (order: Order) => {
    console.log('Publishing order available for pickup notification to couriers');
    return mqttClient.publish('foodapp/couriers/available_orders', {
      orderId: order.id,
      restaurantId: order.restaurant_id,
      timestamp: new Date().toISOString()
    });
  },

  // Notify a specific courier about an assignment
  notifyCourierAssignment: (order: Order, courierId: string) => {
    if (!courierId) return false;
    
    console.log(`Publishing assignment notification to courier ${courierId}`);
    return mqttClient.publish(`foodapp/couriers/${courierId}/assignments`, {
      orderId: order.id,
      restaurantId: order.restaurant_id,
      timestamp: new Date().toISOString()
    });
  }
};
