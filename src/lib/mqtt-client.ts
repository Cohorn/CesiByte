
import mqtt from 'mqtt';

export interface MQTTClient {
  isConnected: () => boolean;
  publish: (topic: string, message: any) => boolean;
  subscribe: (topic: string) => void;
  unsubscribe: (topic: string) => void;
  on: (event: string, callback: (topic: string, message: any) => void) => void;
  off: (event: string, callback: (topic: string, message: any) => void) => void;
}

// MQTT connection parameters
const MQTT_URL = import.meta.env.VITE_MQTT_URL || 'ws://localhost:8000/mqtt'; // Fallback to local MQTT server
let client: mqtt.MqttClient | null = null;
const subscribers = new Map<string, Set<(topic: string, message: any) => void>>();

// Initialize the MQTT client
const initializeMQTTClient = (): MQTTClient => {
  if (client) {
    return createMQTTClientInterface(client);
  }
  
  console.log(`Connecting to MQTT broker at ${MQTT_URL}`);
  
  try {
    client = mqtt.connect(MQTT_URL, {
      clientId: `foodapp_web_${Math.random().toString(16).substr(2, 8)}`,
      clean: true,
      connectTimeout: 10000,
      reconnectPeriod: 3000
    });
    
    // Handle connect event
    client.on('connect', () => {
      console.log('Connected to MQTT broker');
    });
    
    // Handle error event
    client.on('error', (err) => {
      console.error('MQTT connection error:', err);
      client = null;
    });
    
    // Handle close event
    client.on('close', () => {
      console.log('MQTT connection closed');
    });
    
    // Handle reconnect event
    client.on('reconnect', () => {
      console.log('Reconnecting to MQTT broker...');
    });
    
    // Handle incoming messages
    client.on('message', (topic, message) => {
      console.log(`Received message on topic ${topic}`);
      
      let parsedMessage;
      
      // Try to parse the message as JSON, but fallback to raw message if not valid JSON
      try {
        parsedMessage = JSON.parse(message.toString());
      } catch (e) {
        console.log('Message is not valid JSON, using raw message');
        parsedMessage = message.toString();
      }
      
      // Notify all subscribers for this event
      const eventHandlers = subscribers.get('message');
      if (eventHandlers) {
        eventHandlers.forEach(handler => {
          try {
            handler(topic, parsedMessage);
          } catch (error) {
            console.error('Error in MQTT message handler:', error);
          }
        });
      }
    });
    
    return createMQTTClientInterface(client);
  } catch (error) {
    console.error('Failed to initialize MQTT client:', error);
    return createMockMQTTClientInterface();
  }
};

// Create a standardized interface for the MQTT client
const createMQTTClientInterface = (mqttClient: mqtt.MqttClient): MQTTClient => {
  return {
    isConnected: () => mqttClient.connected,
    
    publish: (topic: string, message: any) => {
      if (!mqttClient.connected) {
        console.warn('Cannot publish, MQTT client not connected');
        return false;
      }
      
      const messageString = typeof message === 'string' 
        ? message 
        : JSON.stringify(message);
      
      console.log(`Publishing to ${topic}:`, messageString.substring(0, 100) + (messageString.length > 100 ? '...' : ''));
      
      mqttClient.publish(topic, messageString);
      return true;
    },
    
    subscribe: (topic: string) => {
      console.log(`Subscribing to MQTT topic: ${topic}`);
      mqttClient.subscribe(topic);
    },
    
    unsubscribe: (topic: string) => {
      console.log(`Unsubscribing from MQTT topic: ${topic}`);
      mqttClient.unsubscribe(topic);
    },
    
    on: (event: string, callback: (topic: string, message: any) => void) => {
      // Store the callback in our map
      if (!subscribers.has(event)) {
        subscribers.set(event, new Set());
      }
      
      subscribers.get(event)?.add(callback);
    },
    
    off: (event: string, callback: (topic: string, message: any) => void) => {
      const eventHandlers = subscribers.get(event);
      if (eventHandlers) {
        eventHandlers.delete(callback);
      }
    }
  };
};

// Create a mock client for when MQTT is not available
const createMockMQTTClientInterface = (): MQTTClient => {
  console.warn('Using mock MQTT client');
  return {
    isConnected: () => false,
    publish: () => false,
    subscribe: () => {},
    unsubscribe: () => {},
    on: () => {},
    off: () => {}
  };
};

// Export a singleton instance of the MQTT client
export const mqttClient = initializeMQTTClient();
