import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { NotificationProps } from '@/components/notifications/NotificationItem';
import { orderMQTTService } from '@/api/services/orderMQTT';
import { mqttClient } from '@/lib/mqtt-client';
import { useAuth } from '@/lib/AuthContext';
import { OrderStatus } from '@/lib/database.types';

// Define the maximum number of notifications to keep
const MAX_NOTIFICATIONS = 50;

// Define order status display names for better user experience
const orderStatusDisplayNames: Record<OrderStatus, string> = {
  created: 'Created',
  accepted_by_restaurant: 'Accepted by Restaurant',
  preparing: 'Preparing',
  ready_for_pickup: 'Ready for Pickup',
  picked_up: 'Picked Up',
  on_the_way: 'On the Way',
  delivered: 'Delivered',
  completed: 'Completed',
  canceled: 'Canceled'
};

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationProps[]>([]);
  const { user } = useAuth();
  
  // Load notifications from localStorage on mount
  useEffect(() => {
    if (!user) return;
    
    try {
      const savedNotifications = localStorage.getItem(`notifications_${user.id}`);
      if (savedNotifications) {
        const parsed = JSON.parse(savedNotifications);
        // Convert time strings back to Date objects
        const withDates = parsed.map((n: any) => ({
          ...n,
          time: new Date(n.time)
        }));
        setNotifications(withDates);
      }
    } catch (error) {
      console.error('Error loading notifications from localStorage:', error);
    }
  }, [user]);
  
  // Save notifications to localStorage when they change
  useEffect(() => {
    if (!user || notifications.length === 0) return;
    
    try {
      localStorage.setItem(`notifications_${user.id}`, JSON.stringify(notifications));
    } catch (error) {
      console.error('Error saving notifications to localStorage:', error);
    }
  }, [notifications, user]);
  
  // Add a new notification
  const addNotification = useCallback((notification: Omit<NotificationProps, 'id' | 'time'>) => {
    setNotifications(prev => {
      const newNotification: NotificationProps = {
        ...notification,
        id: uuidv4(),
        time: new Date(),
      };
      
      // Add to the beginning of the array and limit the total count
      const updated = [newNotification, ...prev].slice(0, MAX_NOTIFICATIONS);
      return updated;
    });
  }, []);
  
  // Dismiss a specific notification
  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);
  
  // Dismiss all notifications
  const dismissAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);
  
  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(notification => ({ ...notification, read: true })));
  }, []);
  
  // Mark a specific notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  }, []);
  
  // Subscribe to relevant MQTT topics based on user type
  useEffect(() => {
    if (!user || !mqttClient) return;
    
    const handleOrderStatusUpdate = (message: any) => {
      try {
        console.log('Received order status update:', message);
        let shouldNotify = false;
        let notificationContent = {};
        
        // Restaurant user receiving a new order
        if (user.user_type === 'restaurant' && message.status === 'created') {
          shouldNotify = true;
          notificationContent = {
            title: 'New Order Received',
            message: `Order #${message.orderId?.substring(0, 8) || 'New'} has been placed and is waiting for acceptance.`,
            type: 'info' as const
          };
        } 
        // Customer receiving a status update for their order
        else if (user.user_type === 'customer' && message.status !== 'created') {
          shouldNotify = true;
          notificationContent = {
            title: 'Order Status Updated',
            message: `Your order is now: ${orderStatusDisplayNames[message.status as OrderStatus] || message.status}`,
            type: 'info' as const
          };
        }
        // Courier being assigned to an order
        else if (user.user_type === 'courier' && message.status === 'ready_for_pickup') {
          shouldNotify = true;
          notificationContent = {
            title: 'New Delivery Available',
            message: `Order #${message.orderId?.substring(0, 8) || 'New'} is ready for pickup.`,
            type: 'info' as const
          };
        }
        
        if (shouldNotify) {
          addNotification(notificationContent);
        }
      } catch (error) {
        console.error('Error processing notification message:', error);
      }
    };
    
    // Subscribe to different topics based on user type
    if (user.user_type === 'restaurant') {
      const restaurantId = user.id; // Assuming the restaurant user ID matches the restaurant ID
      console.log(`Subscribing to restaurant notifications for: ${restaurantId}`);
      mqttClient.subscribe(`foodapp/restaurants/${restaurantId}/orders`);
    } else if (user.user_type === 'customer') {
      console.log(`Subscribing to customer notifications for: ${user.id}`);
      mqttClient.subscribe(`foodapp/users/${user.id}/orders/#`);
    } else if (user.user_type === 'courier') {
      console.log(`Subscribing to courier notifications for: ${user.id}`);
      mqttClient.subscribe(`foodapp/couriers/${user.id}/assignments`);
    }
    
    // Use the orderMQTTService to subscribe to order updates
    const unsubscribe = orderMQTTService.subscribeToOrderUpdates((order) => {
      console.log('Received order update from MQTT service:', order);
      
      // This will handle general order updates not covered by the specific topics above
      if (
        (user.user_type === 'customer' && order.user_id === user.id) ||
        (user.user_type === 'restaurant' && order.restaurant_id === user.id) ||
        (user.user_type === 'courier' && order.courier_id === user.id)
      ) {
        addNotification({
          title: 'Order Updated',
          message: `Order #${order.id.substring(0, 8)} has been updated.`,
          type: 'info'
        });
      }
    });
    
    // React to MQTT messages
    const handleMessage = (topic: string, message: any) => {
      if (topic.includes('/orders/') || topic.includes('/assignments')) {
        handleOrderStatusUpdate(message);
      }
    };
    
    mqttClient.on('message', handleMessage);
    
    return () => {
      // Unsubscribe from MQTT topics
      if (user.user_type === 'restaurant') {
        mqttClient.unsubscribe(`foodapp/restaurants/${user.id}/orders`);
      } else if (user.user_type === 'customer') {
        mqttClient.unsubscribe(`foodapp/users/${user.id}/orders/#`);
      } else if (user.user_type === 'courier') {
        mqttClient.unsubscribe(`foodapp/couriers/${user.id}/assignments`);
      }
      
      // Remove message handler
      mqttClient.off('message', handleMessage);
      
      // Unsubscribe from orderMQTTService
      unsubscribe();
    };
  }, [user, addNotification]);
  
  return {
    notifications,
    addNotification,
    dismissNotification,
    dismissAllNotifications,
    markAllAsRead,
    markAsRead,
    unreadCount: notifications.filter(n => !n.read).length
  };
};
