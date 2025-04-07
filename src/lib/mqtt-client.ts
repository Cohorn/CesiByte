
// MQTT client for the frontend
// This is a simplified implementation that uses the WebSocket proxy in the API gateway

class MQTTClient {
  private ws: WebSocket | null = null;
  private connected = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private subscriptions: Map<string, Set<(message: any) => void>> = new Map();
  private messageQueue: Array<{topic: string, message: any}> = [];
  private connectionAttempts = 0;
  private maxReconnectDelay = 30000; // Maximum delay is 30 seconds
  private eventHandlers: Map<string, Set<(topic: string, message: any) => void>> = new Map(); // Added event handlers map

  // Connect to the MQTT WebSocket proxy
  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    
    // Use API gateway WebSocket endpoint for MQTT
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/mqtt`;
    
    console.log(`Connecting to MQTT WebSocket proxy at ${wsUrl}`);
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('Connected to MQTT WebSocket proxy');
        this.connected = true;
        this.connectionAttempts = 0;
        
        // Resubscribe to all previously subscribed topics
        for (const topic of this.subscriptions.keys()) {
          this.sendSubscribe(topic);
        }
        
        // Send any queued messages
        this.processMessageQueue();
      };
      
      this.ws.onmessage = this.handleMessage.bind(this);
      
      this.ws.onclose = () => {
        console.log('Disconnected from MQTT WebSocket proxy');
        this.connected = false;
        this.scheduleReconnect();
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    // Try to reconnect with exponential backoff
    if (!this.reconnectTimeout) {
      // Calculate delay with exponential backoff, capped at maxReconnectDelay
      const delay = Math.min(
        1000 * Math.pow(2, this.connectionAttempts), 
        this.maxReconnectDelay
      );
      
      console.log(`Will try to reconnect in ${delay}ms`);
      
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectTimeout = null;
        this.connectionAttempts++;
        this.connect();
      }, delay);
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  private processMessageQueue() {
    while (this.messageQueue.length > 0 && this.connected) {
      const { topic, message } = this.messageQueue.shift()!;
      this.publish(topic, message);
    }
  }
  
  private handleMessage(event: MessageEvent) {
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
        this.notifySubscribers(data.topic, messageData);
        
        // Check for wildcard subscribers
        this.notifyWildcardSubscribers(data.topic, messageData);
        
        // Trigger event handlers
        this.triggerEventHandlers(data.topic, messageData);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  }
  
  // New method: Trigger event handlers for message events
  private triggerEventHandlers(topic: string, message: any) {
    const messageHandlers = this.eventHandlers.get('message');
    if (messageHandlers) {
      messageHandlers.forEach(handler => {
        try {
          handler(topic, message);
        } catch (error) {
          console.error(`Error in message event handler:`, error);
        }
      });
    }
  }

  private notifySubscribers(topic: string, messageData: any) {
    const handlers = this.subscriptions.get(topic);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(messageData);
        } catch (error) {
          console.error(`Error in subscriber callback for topic ${topic}:`, error);
        }
      });
    }
  }

  private notifyWildcardSubscribers(topic: string, messageData: any) {
    for (const [subscribedTopic, topicHandlers] of this.subscriptions.entries()) {
      if (subscribedTopic.includes('#') && this.matchTopic(topic, subscribedTopic)) {
        topicHandlers.forEach(handler => {
          try {
            handler(messageData);
          } catch (error) {
            console.error(`Error in wildcard subscriber callback for topic ${topic}:`, error);
          }
        });
      }
    }
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
      
      if (i >= actualParts.length) {
        return false;
      }
      
      if (subParts[i] !== '+' && subParts[i] !== actualParts[i]) {
        return false;
      }
    }
    
    return actualParts.length === subParts.length;
  }

  private sendSubscribe(topic: string) {
    if (this.connected && this.ws) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        topic
      }));
    }
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
      this.sendSubscribe(topic);
    } else {
      // Make sure we're trying to connect
      this.connect();
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
        this.sendUnsubscribe(topic);
      }
    } else {
      this.subscriptions.delete(topic);
      this.sendUnsubscribe(topic);
    }
  }

  private sendUnsubscribe(topic: string) {
    if (this.connected && this.ws) {
      this.ws.send(JSON.stringify({
        type: 'unsubscribe',
        topic
      }));
    }
  }
  
  // Publish a message to a topic
  publish(topic: string, message: any) {
    const formattedMessage = typeof message === 'object' ? JSON.stringify(message) : message;
    
    if (this.connected && this.ws) {
      this.ws.send(JSON.stringify({
        type: 'publish',
        topic,
        message: formattedMessage
      }));
    } else {
      // Queue the message for when we connect
      this.messageQueue.push({ topic, message });
      
      // Make sure we're trying to connect
      this.connect();
    }
  }
  
  // New method: Add event listener for generic events
  on(event: string, handler: (...args: any[]) => void) {
    if (event === 'message') {
      if (!this.eventHandlers.has(event)) {
        this.eventHandlers.set(event, new Set());
      }
      this.eventHandlers.get(event)!.add(handler as any);
    } else {
      console.warn(`Unsupported event type: ${event}`);
    }
  }

  // New method: Remove event listener
  off(event: string, handler: (...args: any[]) => void) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event)!.delete(handler as any);
      if (this.eventHandlers.get(event)!.size === 0) {
        this.eventHandlers.delete(event);
      }
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
