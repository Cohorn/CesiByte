
import { useState, useEffect, useCallback } from 'react';

// MQTT WebSocket client for browser
export interface MQTTMessage {
  topic: string;
  message: string;
}

class MQTTClient {
  private webSocket: WebSocket | null = null;
  private isConnected: boolean = false;
  private reconnectTimer: number | null = null;
  private messageCallbacks: ((topic: string, message: any) => void)[] = [];
  private connectionCallbacks: ((connected: boolean) => void)[] = [];
  private subscribedTopics: Set<string> = new Set();
  private apiUrl: string = '';
  
  constructor() {
    // Use window.location to determine the API URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.PROD 
      ? window.location.host 
      : (import.meta.env.VITE_API_URL?.replace(/^https?:\/\//, '') || 'localhost:7500');
    
    this.apiUrl = `${protocol}//${host}/mqtt`;
    console.log('MQTT WebSocket URL:', this.apiUrl);
  }
  
  connect(): void {
    if (this.webSocket) {
      return;
    }
    
    try {
      console.log('Connecting to MQTT WebSocket proxy at', this.apiUrl);
      this.webSocket = new WebSocket(this.apiUrl);
      
      this.webSocket.onopen = () => {
        console.log('Connected to MQTT WebSocket proxy');
        this.isConnected = true;
        
        // Resubscribe to all topics
        this.subscribedTopics.forEach(topic => {
          this.sendSubscribeMessage(topic);
        });
        
        // Notify connection callbacks
        this.connectionCallbacks.forEach(callback => callback(true));
        
        // Clear any reconnection timer
        if (this.reconnectTimer !== null) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };
      
      this.webSocket.onmessage = (event) => {
        try {
          const data: MQTTMessage = JSON.parse(event.data);
          const { topic, message } = data;
          
          // Parse the message if it's JSON
          let parsedMessage;
          try {
            parsedMessage = JSON.parse(message);
          } catch (e) {
            parsedMessage = message;
          }
          
          console.log(`Received message on topic ${topic}:`, parsedMessage);
          
          // Notify message callbacks
          this.messageCallbacks.forEach(callback => {
            callback(topic, parsedMessage);
          });
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };
      
      this.webSocket.onclose = () => {
        console.log('Disconnected from MQTT WebSocket proxy');
        this.isConnected = false;
        this.webSocket = null;
        
        // Notify connection callbacks
        this.connectionCallbacks.forEach(callback => callback(false));
        
        // Schedule reconnection
        this.scheduleReconnect();
      };
      
      this.webSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        // The onclose handler will be called after this
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      this.scheduleReconnect();
    }
  }
  
  private scheduleReconnect(): void {
    if (this.reconnectTimer === null) {
      console.log('Scheduling reconnection in 5 seconds...');
      this.reconnectTimer = window.setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, 5000);
    }
  }
  
  disconnect(): void {
    if (this.webSocket && this.isConnected) {
      this.webSocket.close();
    }
    
    // Clear any reconnection timer
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
  
  subscribe(topic: string): void {
    this.subscribedTopics.add(topic);
    
    if (this.isConnected) {
      this.sendSubscribeMessage(topic);
    } else {
      this.connect(); // Will automatically subscribe on connection
    }
  }
  
  private sendSubscribeMessage(topic: string): void {
    if (this.webSocket && this.isConnected) {
      this.webSocket.send(JSON.stringify({
        type: 'subscribe',
        topic
      }));
      console.log(`Subscribed to topic: ${topic}`);
    }
  }
  
  unsubscribe(topic: string): void {
    this.subscribedTopics.delete(topic);
    
    if (this.webSocket && this.isConnected) {
      this.webSocket.send(JSON.stringify({
        type: 'unsubscribe',
        topic
      }));
      console.log(`Unsubscribed from topic: ${topic}`);
    }
  }
  
  publish(topic: string, message: any): void {
    if (this.webSocket && this.isConnected) {
      this.webSocket.send(JSON.stringify({
        type: 'publish',
        topic,
        message
      }));
      console.log(`Published message to ${topic}:`, message);
    } else {
      console.warn('Cannot publish message: not connected');
      // Auto-connect and retry
      this.connect();
    }
  }
  
  onMessage(callback: (topic: string, message: any) => void): () => void {
    this.messageCallbacks.push(callback);
    
    return () => {
      const index = this.messageCallbacks.indexOf(callback);
      if (index !== -1) {
        this.messageCallbacks.splice(index, 1);
      }
    };
  }
  
  onConnection(callback: (connected: boolean) => void): () => void {
    this.connectionCallbacks.push(callback);
    
    // Immediately call with current state
    callback(this.isConnected);
    
    return () => {
      const index = this.connectionCallbacks.indexOf(callback);
      if (index !== -1) {
        this.connectionCallbacks.splice(index, 1);
      }
    };
  }
}

// Create a singleton instance
const mqttClient = new MQTTClient();

export const useMQTT = () => {
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    // Connect on component mount
    mqttClient.connect();
    
    // Track connection state
    const unsubscribe = mqttClient.onConnection(setIsConnected);
    
    // Disconnect on component unmount
    return () => {
      unsubscribe();
    };
  }, []);
  
  const subscribe = useCallback((topic: string) => {
    mqttClient.subscribe(topic);
  }, []);
  
  const unsubscribe = useCallback((topic: string) => {
    mqttClient.unsubscribe(topic);
  }, []);
  
  const publish = useCallback((topic: string, message: any) => {
    mqttClient.publish(topic, message);
  }, []);
  
  const onMessage = useCallback((callback: (topic: string, message: any) => void) => {
    return mqttClient.onMessage(callback);
  }, []);
  
  return {
    isConnected,
    subscribe,
    unsubscribe,
    publish,
    onMessage
  };
};

export default mqttClient;
