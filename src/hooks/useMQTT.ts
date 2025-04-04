
import { useEffect, useCallback, useState } from 'react';
import { mqttClient } from '@/lib/mqtt-client';

// Hook for using MQTT in React components
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
    
    mqttClient.subscribe(topic, handleMessage);
    
    return () => {
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
    
    mqttClient.subscribe(`foodapp/orders/${orderId}/status`, handleStatusUpdate);
    
    return () => {
      mqttClient.unsubscribe(`foodapp/orders/${orderId}/status`, handleStatusUpdate);
    };
  }, [orderId]);
  
  return { orderStatus };
}

// Hook for restaurant orders via MQTT
export function useRestaurantOrdersMQTT(restaurantId?: string) {
  const [newOrder, setNewOrder] = useState<any | null>(null);
  
  useEffect(() => {
    if (!restaurantId) return;
    
    const handleNewOrder = (order: any) => {
      setNewOrder(order);
    };
    
    mqttClient.subscribe(`foodapp/restaurants/${restaurantId}/orders`, handleNewOrder);
    
    return () => {
      mqttClient.unsubscribe(`foodapp/restaurants/${restaurantId}/orders`, handleNewOrder);
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
    
    mqttClient.subscribe(`foodapp/couriers/${courierId}/assignments`, handleNewAssignment);
    
    return () => {
      mqttClient.unsubscribe(`foodapp/couriers/${courierId}/assignments`, handleNewAssignment);
    };
  }, [courierId]);
  
  return { newAssignment };
}
