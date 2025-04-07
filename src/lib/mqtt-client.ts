
import React from 'react';

// MQTT client for the frontend
// This is a simplified implementation that uses the WebSocket proxy in the API gateway

class MQTTClient {
  private ws: WebSocket | null = null;
  private connected = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private subscriptions: Map<string, Set<(message: any) => void>> = new Map();
  private messageQueue: Array<{topic: string, message: any}> = [];

  // Connect to the MQTT WebSocket proxy
  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    // Use API gateway WebSocket endpoint for MQTT
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/mqtt`;
    
    console.log(`Connecting to MQTT WebSocket proxy at ${wsUrl}`);
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('Connected to MQTT WebSocket proxy');
      this.connected = true;
      
      // Resubscribe to all previously subscribed topics
      for (const topic of this.subscriptions.keys()) {
        this.subscribe(topic);
      }
      
      // Send any queued messages
      while (this.messageQueue.length > 0) {
        const { topic, message } = this.messageQueue.shift()!;
        this.publish(topic, message);
      }
    };
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.topic && data.message) {
          // Parse the message if it's JSON
          let messageData;
          try {
            messageData = JSON.parse(data.message);
          } catch (e) {
            messageData = data.message;
          }
          
          // Notify subscribers
          const handlers = this.subscriptions.get(data.topic);
          if (handlers) {
            handlers.forEach(handler => handler(messageData));
          }
          
          // Check for wildcard subscribers
          for (const [topic, topicHandlers] of this.subscriptions.entries()) {
            if (topic.includes('#') && this.matchTopic(data.topic, topic)) {
              topicHandlers.forEach(handler => handler(messageData));
            }
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };
    
    this.ws.onclose = () => {
      console.log('Disconnected from MQTT WebSocket proxy');
      this.connected = false;
      
      // Try to reconnect
      if (!this.reconnectTimeout) {
        this.reconnectTimeout = setTimeout(() => {
          this.reconnectTimeout = null;
          this.connect();
        }, 3000);
      }
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }
  
  // Checks if a topic matches a wildcard subscription
  private matchTopic(actualTopic: string, subscribedTopic: string): boolean {
    if (!subscribedTopic.includes('#')) {
      return actualTopic === subscribedTopic;
    }
    
    const subParts = subscribedTopic.split('/');
    const actualParts = actualTopic.split('/');
    
    for (let i = 0; i < subParts.length; i++) {
      if (subParts[i] === '#') {
        return true; // Any remaining path matches
      }
      
      if (subParts[i] !== '+' && subParts[i] !== actualParts[i]) {
        return false;
      }
    }
    
    return actualParts.length === subParts.length;
  }
  
  // Subscribe to a topic
  subscribe(topic: string, callback?: (message: any) => void) {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }
    
    if (callback) {
      this.subscriptions.get(topic)!.add(callback);
    }
    
    if (this.connected && this.ws) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        topic
      }));
    }
  }
  
  // Unsubscribe from a topic
  unsubscribe(topic: string, callback?: (message: any) => void) {
    if (!this.subscriptions.has(topic)) {
      return;
    }
    
    if (callback) {
      this.subscriptions.get(topic)!.delete(callback);
      
      if (this.subscriptions.get(topic)!.size === 0) {
        this.subscriptions.delete(topic);
      }
    } else {
      this.subscriptions.delete(topic);
    }
    
    if (this.connected && this.ws) {
      this.ws.send(JSON.stringify({
        type: 'unsubscribe',
        topic
      }));
    }
  }
  
  // Publish a message to a topic
  publish(topic: string, message: any) {
    if (this.connected && this.ws) {
      this.ws.send(JSON.stringify({
        type: 'publish',
        topic,
        message: typeof message === 'object' ? JSON.stringify(message) : message
      }));
    } else {
      // Queue the message for when we connect
      this.messageQueue.push({ topic, message });
      
      // Make sure we're trying to connect
      this.connect();
    }
  }
  
  // Disconnect from the MQTT broker
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.connected = false;
  }
}

// Create a singleton instance
export const mqttClient = new MQTTClient();

// Automatically connect when imported
mqttClient.connect();

// Hook for using MQTT in React components
export function useMQTT(topic: string, callback: (message: any) => void) {
  React.useEffect(() => {
    mqttClient.subscribe(topic, callback);
    
    return () => {
      mqttClient.unsubscribe(topic, callback);
    };
  }, [topic, callback]);
  
  return {
    publish: mqttClient.publish.bind(mqttClient)
  };
}
