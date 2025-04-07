
import { useEffect, useCallback, useState } from 'react';
import { mqttClient } from '@/lib/mqtt-client';

// Generic hook for using MQTT in React components
export function useMQTT<T = any>(topic: string) {
  const [messages, setMessages] = useState<T[]>([]);
  const [lastMessage, setLastMessage] = useState<T | null>(null);
  
  const publish = useCallback((message: any) => {
    mqttClient.publish(topic, message);
  }, [topic]);
  
  useEffect(() => {
    const handleMessage = (message: T) => {
      setLastMessage(message);
      setMessages(prev => [message, ...prev].slice(0, 100)); // Keep last 100 messages
    };
    
    console.log(`Subscribing to MQTT topic: ${topic}`);
    mqttClient.subscribe(topic, handleMessage);
    
    return () => {
      console.log(`Unsubscribing from MQTT topic: ${topic}`);
      mqttClient.unsubscribe(topic, handleMessage);
    };
  }, [topic]);
  
  return {
    messages,
    lastMessage,
    publish
  };
}

// Hook for order updates via MQTT
export function useOrderMQTT(orderId?: string) {
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  
  useEffect(() => {
    if (!orderId) return;
    
    const handleStatusUpdate = (message: any) => {
      if (message.status) {
        setOrderStatus(message.status);
      }
    };
    
    const topic = `foodapp/orders/${orderId}/status`;
    console.log(`Subscribing to order status MQTT topic: ${topic}`);
    mqttClient.subscribe(topic, handleStatusUpdate);
    
    return () => {
      console.log(`Unsubscribing from order status MQTT topic: ${topic}`);
      mqttClient.unsubscribe(topic, handleStatusUpdate);
    };
  }, [orderId]);
  
  return { orderStatus };
}

// Hook for restaurant orders via MQTT
export function useRestaurantOrdersMQTT(restaurantId?: string) {
  const [newOrder, setNewOrder] = useState<any | null>(null);
  
  useEffect(() => {
    if (!restaurantId) {
      console.log('No restaurant ID provided for MQTT subscription');
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
      mqttClient.unsubscribe(topic, handleNewOrder);
    };
  }, [restaurantId]);
  
  return { newOrder };
}

// Hook for courier assignments via MQTT
export function useCourierAssignmentsMQTT(courierId?: string) {
  const [newAssignment, setNewAssignment] = useState<any | null>(null);
  
  useEffect(() => {
    if (!courierId) return;
    
    const handleNewAssignment = (assignment: any) => {
      setNewAssignment(assignment);
    };
    
    const topic = `foodapp/couriers/${courierId}/assignments`;
    console.log(`Subscribing to courier assignments MQTT topic: ${topic}`);
    mqttClient.subscribe(topic, handleNewAssignment);
    
    return () => {
      console.log(`Unsubscribing from courier assignments MQTT topic: ${topic}`);
      mqttClient.unsubscribe(topic, handleNewAssignment);
    };
  }, [courierId]);
  
  return { newAssignment };
}
