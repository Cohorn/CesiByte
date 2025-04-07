
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { mqttClient } from '@/lib/mqtt-client';
import { useToast } from '@/hooks/use-toast';

export interface NotificationProps {
  id: string;
  title: string;
  message: string;
  time: Date;
  read: boolean;
  type: 'order' | 'restaurant' | 'courier' | 'system';
  data?: any;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationProps[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Update unread count whenever notifications change
  useEffect(() => {
    const count = notifications.filter(n => !n.read).length;
    setUnreadCount(count);
  }, [notifications]);

  // Function to add a new notification
  const addNotification = useCallback((notification: Omit<NotificationProps, 'id' | 'time'>) => {
    const newNotification: NotificationProps = {
      id: crypto.randomUUID(),
      time: new Date(),
      read: false,
      ...notification
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep the last 50 notifications

    // Also show a toast for immediate feedback
    toast({
      title: notification.title,
      description: notification.message,
    });

    return newNotification;
  }, [toast]);

  // Mark a notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
  }, []);

  // Delete a notification
  const deleteNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Setup MQTT subscriptions based on user type
  useEffect(() => {
    if (!user || !mqttClient) return;

    console.log(`Setting up notification subscriptions for ${user.user_type} user: ${user.id}`);
    setIsConnected(mqttClient.isConnected());

    // Topics based on user type
    const topics: string[] = [];
    
    // All users get notifications about their own orders
    topics.push(`foodapp/users/${user.id}/notifications`);
    
    // User-specific topics
    if (user.user_type === 'restaurant' && user.id) {
      topics.push(`foodapp/restaurants/${user.id}/orders`);
    }
    
    if (user.user_type === 'courier') {
      topics.push(`foodapp/couriers/available_orders`);
      if (user.id) {
        topics.push(`foodapp/couriers/${user.id}/assignments`);
      }
    }

    // Function to handle incoming notifications
    const handleNotification = (topic: string, message: any) => {
      console.log(`Received notification on topic ${topic}:`, message);
      
      try {
        // Parse the message if it's a string
        const data = typeof message === 'string' ? JSON.parse(message) : message;
        
        // Create notification based on the topic and data
        if (topic.includes('/orders')) {
          addNotification({
            title: 'New Order',
            message: `You've received a new order${data.id ? ` #${data.id.substring(0, 8)}` : ''}!`,
            type: 'restaurant',
            data
          });
        } else if (topic.includes('/available_orders')) {
          addNotification({
            title: 'Available Delivery',
            message: `There's a new order available for delivery!`,
            type: 'courier',
            data
          });
        } else if (topic.includes('/assignments')) {
          addNotification({
            title: 'New Assignment',
            message: `You've been assigned to a new delivery!`,
            type: 'courier',
            data
          });
        } else if (topic.includes('/notifications')) {
          // User notifications, likely about order status changes
          let title = data.title || 'Order Update';
          let message = data.message || 'Your order status has been updated';
          
          addNotification({
            title,
            message,
            type: 'order',
            data
          });
        }
      } catch (error) {
        console.error('Error processing notification:', error);
      }
    };

    // Subscribe to all topics
    topics.forEach(topic => {
      console.log(`Subscribing to notification topic: ${topic}`);
      mqttClient.subscribe(topic);
    });

    // Set up global message handler
    mqttClient.on('message', handleNotification);

    // Check connection status periodically
    const connectionCheckInterval = setInterval(() => {
      const connected = mqttClient.isConnected();
      if (connected !== isConnected) {
        setIsConnected(connected);
      }
    }, 10000);

    // Cleanup function
    return () => {
      topics.forEach(topic => mqttClient.unsubscribe(topic));
      mqttClient.off('message', handleNotification);
      clearInterval(connectionCheckInterval);
    };
  }, [user, addNotification, isConnected]);

  return {
    notifications,
    unreadCount,
    isConnected,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearNotifications
  };
}
