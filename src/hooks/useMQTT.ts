
import { useEffect, useCallback, useState, useRef } from 'react';
import { mqttClient } from '@/lib/mqtt-client';

// Generic hook for using MQTT in React components
export function useMQTT<T = any>(topic: string) {
  const [messages, setMessages] = useState<T[]>([]);
  const [lastMessage, setLastMessage] = useState<T | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const checkConnectionIntervalRef = useRef<number | null>(null);
  
  // Check connection status periodically
  useEffect(() => {
    // Clear any existing interval
    if (checkConnectionIntervalRef.current) {
      clearInterval(checkConnectionIntervalRef.current);
    }
    
    // Set up new interval
    checkConnectionIntervalRef.current = window.setInterval(() => {
      setIsConnected(mqttClient?.isConnected?.() || false);
    }, 5000) as unknown as number;
    
    return () => {
      if (checkConnectionIntervalRef.current) {
        clearInterval(checkConnectionIntervalRef.current);
        checkConnectionIntervalRef.current = null;
      }
    };
  }, []);
  
  const publish = useCallback((message: any) => {
    if (mqttClient?.publish) {
      mqttClient.publish(topic, message);
    }
  }, [topic]);
  
  useEffect(() => {
    if (!mqttClient?.subscribe) return;

    const handleMessage = (message: T) => {
      setLastMessage(message);
      setMessages(prev => [message, ...prev].slice(0, 100)); // Keep last 100 messages
    };
    
    console.log(`Subscribing to MQTT topic: ${topic}`);
    mqttClient.subscribe(topic, handleMessage);
    
    return () => {
      console.log(`Unsubscribing from MQTT topic: ${topic}`);
      if (mqttClient?.unsubscribe) {
        mqttClient.unsubscribe(topic, handleMessage);
      }
    };
  }, [topic]);
  
  return {
    messages,
    lastMessage,
    publish,
    isConnected
  };
}

// Hook for order updates via MQTT
export function useOrderMQTT(orderId?: string) {
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  
  useEffect(() => {
    if (!orderId || !mqttClient?.subscribe) return;
    
    const handleStatusUpdate = (message: any) => {
      if (message && message.status) {
        setOrderStatus(message.status);
      }
    };
    
    const topic = `foodapp/orders/${orderId}/status`;
    console.log(`Subscribing to order status MQTT topic: ${topic}`);
    mqttClient.subscribe(topic, handleStatusUpdate);
    
    return () => {
      console.log(`Unsubscribing from order status MQTT topic: ${topic}`);
      if (mqttClient?.unsubscribe) {
        mqttClient.unsubscribe(topic, handleStatusUpdate);
      }
    };
  }, [orderId]);
  
  return { orderStatus };
}

// Hook for restaurant orders via MQTT
export function useRestaurantOrdersMQTT(restaurantId?: string) {
  const [newOrder, setNewOrder] = useState<any | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const checkConnectionIntervalRef = useRef<number | null>(null);
  
  // Check connection status periodically
  useEffect(() => {
    // Clear any existing interval
    if (checkConnectionIntervalRef.current) {
      clearInterval(checkConnectionIntervalRef.current);
    }
    
    // Set up new interval with less frequent checks
    checkConnectionIntervalRef.current = window.setInterval(() => {
      setIsConnected(mqttClient?.isConnected?.() || false);
    }, 5000) as unknown as number;
    
    return () => {
      if (checkConnectionIntervalRef.current) {
        clearInterval(checkConnectionIntervalRef.current);
        checkConnectionIntervalRef.current = null;
      }
    };
  }, []);
  
  useEffect(() => {
    if (!restaurantId || !mqttClient?.subscribe) {
      // Always return a valid newOrder state of null when not subscribed
      setNewOrder(null);
      return;
    }
    
    const handleNewOrder = (order: any) => {
      console.log("Restaurant MQTT - New order received:", order);
      setNewOrder(order);
      // Reset after a short delay to allow for subsequent notifications
      setTimeout(() => setNewOrder(null), 5000);
    };
    
    const topic = `foodapp/restaurants/${restaurantId}/orders`;
    console.log(`Subscribing to restaurant MQTT topic: ${topic}`);
    mqttClient.subscribe(topic, handleNewOrder);
    
    return () => {
      console.log(`Unsubscribing from restaurant MQTT topic: ${topic}`);
      if (mqttClient?.unsubscribe) {
        mqttClient.unsubscribe(topic, handleNewOrder);
      }
    };
  }, [restaurantId]);
  
  return { newOrder, isConnected };
}

// Hook for courier assignments via MQTT
export function useCourierAssignmentsMQTT(courierId?: string) {
  const [newAssignment, setNewAssignment] = useState<any | null>(null);
  
  useEffect(() => {
    if (!courierId || !mqttClient?.subscribe) return;
    
    const handleNewAssignment = (assignment: any) => {
      setNewAssignment(assignment);
    };
    
    const topic = `foodapp/couriers/${courierId}/assignments`;
    console.log(`Subscribing to courier assignments MQTT topic: ${topic}`);
    mqttClient.subscribe(topic, handleNewAssignment);
    
    return () => {
      console.log(`Unsubscribing from courier assignments MQTT topic: ${topic}`);
      if (mqttClient?.unsubscribe) {
        mqttClient.unsubscribe(topic, handleNewAssignment);
      }
    };
  }, [courierId]);
  
  return { newAssignment };
}
