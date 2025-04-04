const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const morgan = require('morgan');
const axios = require('axios');
const http = require('http');
const WebSocket = require('ws');
const mqtt = require('mqtt');

const app = express();
const PORT = process.env.PORT || 7500;
const server = http.createServer(app);

// Initialize WebSocket server
const wss = new WebSocket.Server({ server });

// Initialize MQTT client
const mqttBrokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://mqtt-broker:1883';
console.log(`API Gateway connecting to MQTT broker at ${mqttBrokerUrl}`);
const mqttClient = mqtt.connect(mqttBrokerUrl);

// MQTT connection handling
mqttClient.on('connect', () => {
  console.log('API Gateway connected to MQTT broker');
  
  // Subscribe to all events
  mqttClient.subscribe('foodapp/#', (err) => {
    if (!err) {
      console.log('API Gateway subscribed to all foodapp MQTT topics');
    } else {
      console.error('API Gateway failed to subscribe to MQTT topics:', err);
    }
  });
});

mqttClient.on('error', (err) => {
  console.error('API Gateway MQTT connection error:', err);
});

// Handle MQTT messages and relay to WebSocket clients
mqttClient.on('message', (topic, message) => {
  // Relay to all connected WebSocket clients
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && client.subscribedTopics && client.subscribedTopics.includes(topic)) {
      client.send(JSON.stringify({
        topic,
        message: message.toString()
      }));
    }
  });
});

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  console.log('WebSocket client connected');
  
  // Initialize subscribed topics list for this client
  ws.subscribedTopics = [];
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // Handle subscribe message
      if (data.type === 'subscribe' && data.topic) {
        console.log(`WebSocket client subscribing to ${data.topic}`);
        ws.subscribedTopics.push(data.topic);
        
        // Subscribe to MQTT topic if not already subscribed
        mqttClient.subscribe(data.topic, (err) => {
          if (err) {
            console.error(`Failed to subscribe to MQTT topic ${data.topic}:`, err);
          }
        });
      }
      
      // Handle unsubscribe message
      else if (data.type === 'unsubscribe' && data.topic) {
        console.log(`WebSocket client unsubscribing from ${data.topic}`);
        ws.subscribedTopics = ws.subscribedTopics.filter(t => t !== data.topic);
      }
      
      // Handle publish message
      else if (data.type === 'publish' && data.topic && data.message) {
        console.log(`WebSocket client publishing to ${data.topic}`);
        mqttClient.publish(data.topic, JSON.stringify(data.message));
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// Enhanced logging format
morgan.token('body', (req) => {
  if (req.body && Object.keys(req.body).length > 0) {
    const sanitizedBody = { ...req.body };
    if (sanitizedBody.password) sanitizedBody.password = '***';
    return JSON.stringify(sanitizedBody);
  }
  return '';
});

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '2mb' }));
app.use(morgan(':method :url :status :response-time ms - :body'));

// Add detailed request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  if (req.body && Object.keys(req.body).length > 0) {
    const sanitizedBody = { ...req.body };
    if (sanitizedBody.password) sanitizedBody.password = '***';
    console.log('Request body:', sanitizedBody);
  }
  next();
});

// JWT Authentication Middleware
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  // Public endpoints don't need authentication
  if (req.path.startsWith('/auth') && req.method !== 'GET') {
    return next();
  }
  
  console.log(`Authenticating request to ${req.path}`);
  
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    
    // Log token for debugging (don't do this in production)
    console.log(`Token received: ${token.substring(0, 15)}...`);
    
    jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_here', (err, user) => {
      if (err) {
        console.error('JWT verification error:', err.message);
        return res.status(403).json({ error: 'Invalid token', details: err.message });
      }
      
      req.user = user;
      console.log('User authenticated:', req.user);
      next();
    });
  } else {
    console.log('No auth token provided for protected route');
    res.status(401).json({ error: 'Authentication required' });
  }
};

// Function to handle request body forwarding
const handleProxyRequest = (proxyReq, req, res) => {
  if (req.body && Object.keys(req.body).length > 0) {
    // Log the body being forwarded (with sensitive data masked)
    const sanitizedBody = { ...req.body };
    if (sanitizedBody.password) sanitizedBody.password = '***';
    console.log('Proxy forwarding body:', sanitizedBody);
    
    // Stringify the body
    const bodyData = JSON.stringify(req.body);
    
    // Set the correct content length
    proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
    
    // Forward any authorization headers
    if (req.headers.authorization) {
      proxyReq.setHeader('Authorization', req.headers.authorization);
    }
    
    // Write the body to the proxy request
    proxyReq.write(bodyData);
    proxyReq.end();
  }
};

// Route for health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    mqtt: mqttClient.connected ? 'connected' : 'disconnected'
  });
});

// Add MQTT health check endpoint
app.get('/mqtt/health', (req, res) => {
  if (mqttClient.connected) {
    res.status(200).json({ status: 'connected' });
  } else {
    res.status(503).json({ status: 'disconnected' });
  }
});

// Define service URLs using Docker service names
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
const RESTAURANT_SERVICE_URL = process.env.RESTAURANT_SERVICE_URL || 'http://restaurant-service:3002';
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://order-service:3003';
const REVIEW_SERVICE_URL = process.env.REVIEW_SERVICE_URL || 'http://review-service:3004';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3005';

console.log('API Gateway initializing with services:');
console.log(`- Auth Service: ${AUTH_SERVICE_URL}`);
console.log(`- Restaurant Service: ${RESTAURANT_SERVICE_URL}`);
console.log(`- Order Service: ${ORDER_SERVICE_URL}`);
console.log(`- Review Service: ${REVIEW_SERVICE_URL}`);
console.log(`- User Service: ${USER_SERVICE_URL}`);
console.log(`- MQTT Broker: ${mqttBrokerUrl}`);

// Check if auth service is reachable
const checkAuthService = async () => {
  try {
    console.log(`Testing connection to Auth Service at ${AUTH_SERVICE_URL}/health...`);
    const response = await axios.get(`${AUTH_SERVICE_URL}/health`, { timeout: 5000 });
    console.log('Auth service connection test result:', response.data);
    return true;
  } catch (error) {
    console.error('Auth service connection test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('Cannot connect to auth service. Connection refused.');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('Connection to auth service timed out.');
    } else {
      console.error('Auth service error details:', error);
    }
    return false;
  }
};

// Run connection check on startup
setTimeout(() => {
  checkAuthService();
}, 5000); // Slight delay to allow service initialization

// Routes that don't require authentication
app.use('/auth', createProxyMiddleware({
  target: AUTH_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/auth': '' // This is critical - it rewrites /auth to / for the auth service
  },
  onProxyReq: handleProxyRequest,
  onProxyRes: (proxyRes, req, res) => {
    console.log(`[${new Date().toISOString()}] Auth service responded with status: ${proxyRes.statusCode}`);
    
    // Log response for debugging
    let responseBody = '';
    proxyRes.on('data', (chunk) => {
      responseBody += chunk;
    });
    
    proxyRes.on('end', () => {
      try {
        // Try to parse the response as JSON
        const parsedBody = JSON.parse(responseBody);
        console.log(`Auth service response: ${JSON.stringify(parsedBody).substring(0, 200)}${responseBody.length > 200 ? '...' : ''}`);
      } catch (e) {
        // If not valid JSON, log as is (truncated)
        console.log(`Auth service raw response: ${responseBody.substring(0, 200)}${responseBody.length > 200 ? '...' : ''}`);
      }
    });
  },
  onError: (err, req, res) => {
    console.error(`[${new Date().toISOString()}] Auth service proxy error: ${err.message}`);
    console.error('Error details:', err.code, err.stack);
    
    // Check if error is due to connection issues
    if (err.code === 'ECONNREFUSED') {
      res.status(503).json({ error: 'Auth service unavailable', details: 'Connection refused' });
    } else if (err.code === 'ETIMEDOUT') {
      res.status(504).json({ error: 'Auth service timeout', details: 'Request timed out' });
    } else {
      res.status(500).json({ error: 'Auth service error', details: err.message });
    }
    
    // Attempt to recheck connection
    setTimeout(() => {
      checkAuthService();
    }, 1000);
  }
}));

// Routes for restaurant service
app.use('/restaurants', authenticateJWT, createProxyMiddleware({
  target: RESTAURANT_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/restaurants': ''
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log('Forwarding restaurant request with auth:', req.headers.authorization ? 'Yes' : 'No');
    handleProxyRequest(proxyReq, req, res);
    
    // Ensure authorization header is forwarded
    if (req.headers.authorization) {
      proxyReq.setHeader('Authorization', req.headers.authorization);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`[${new Date().toISOString()}] Restaurant service responded with status: ${proxyRes.statusCode} for ${req.method} ${req.url}`);
    
    // Add logging for restaurant service responses
    let responseBody = '';
    proxyRes.on('data', (chunk) => {
      responseBody += chunk;
    });
    
    proxyRes.on('end', () => {
      try {
        // Try to parse the response as JSON
        const parsedBody = JSON.parse(responseBody);
        console.log(`Restaurant service response: ${JSON.stringify(parsedBody).substring(0, 200)}${responseBody.length > 200 ? '...' : ''}`);
      } catch (e) {
        // If not valid JSON, log as is
        console.log(`Restaurant service raw response: ${responseBody.substring(0, 200)}${responseBody.length > 200 ? '...' : ''}`);
      }
    });
  },
  onError: (err, req, res) => {
    console.error(`Restaurant service proxy error: ${err.message}`);
    console.error('Error details:', err.code, err.stack);
    
    if (err.code === 'ECONNREFUSED') {
      res.status(503).json({ error: 'Restaurant service unavailable', details: 'Connection refused' });
    } else if (err.code === 'ETIMEDOUT') {
      res.status(504).json({ error: 'Restaurant service timeout', details: 'Request timed out' });
    } else {
      res.status(500).json({ error: 'Restaurant service error', details: err.message });
    }
  }
}));

// Routes for order service
app.use('/orders', authenticateJWT, createProxyMiddleware({
  target: ORDER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/orders': ''
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[${new Date().toISOString()}] Proxying ${req.method} order request to: ${ORDER_SERVICE_URL}${req.url.replace(/^\/orders/, '')}`);
    console.log('Forwarding order request with auth token:', req.headers.authorization ? 'Yes' : 'No');
    
    // Make sure auth header is forwarded
    if (req.headers.authorization) {
      proxyReq.setHeader('Authorization', req.headers.authorization);
    }
    
    handleProxyRequest(proxyReq, req, res);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`[${new Date().toISOString()}] Order service responded with status: ${proxyRes.statusCode} for ${req.method} ${req.url}`);
    
    // Log response body for debugging
    let responseBody = '';
    proxyRes.on('data', (chunk) => {
      responseBody += chunk;
    });
    
    proxyRes.on('end', () => {
      try {
        // Try to parse the response as JSON for logging
        const parsedBody = JSON.parse(responseBody);
        console.log(`Order service response body: ${JSON.stringify(parsedBody).substring(0, 200)}${responseBody.length > 200 ? '...' : ''}`);
      } catch (e) {
        // If not valid JSON, log as is
        console.log(`Order service raw response: ${responseBody.substring(0, 200)}${responseBody.length > 200 ? '...' : ''}`);
      }
    });
  },
  onError: (err, req, res) => {
    console.error(`Order service proxy error: ${err.message}`);
    console.error('Error details:', err.code, err.stack);
    
    if (err.code === 'ECONNREFUSED') {
      res.status(503).json({ error: 'Order service unavailable', details: 'Connection refused' });
    } else if (err.code === 'ETIMEDOUT') {
      res.status(504).json({ error: 'Order service timeout', details: 'Request timed out' });
    } else {
      res.status(500).json({ error: 'Order service error', details: err.message });
    }
  }
}));

// Add direct ping endpoint for testing order service connection
app.get('/ping-order', async (req, res) => {
  try {
    const response = await axios.get(`${ORDER_SERVICE_URL}/health`, { timeout: 5000 });
    res.status(200).json({ 
      message: 'Successfully connected to Order service',
      orderServiceResponse: response.data
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to connect to Order service', 
      details: error.message, 
      code: error.code 
    });
  }
});

app.use('/reviews', authenticateJWT, createProxyMiddleware({
  target: REVIEW_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/reviews': ''
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[${new Date().toISOString()}] Proxying ${req.method} review request to: ${REVIEW_SERVICE_URL}${req.url.replace(/^\/reviews/, '')}`);
    handleProxyRequest(proxyReq, req, res);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`[${new Date().toISOString()}] Review service responded with status: ${proxyRes.statusCode} for ${req.method} ${req.url}`);
    
    // Log response body for debugging
    let responseBody = '';
    proxyRes.on('data', (chunk) => {
      responseBody += chunk;
    });
    
    proxyRes.on('end', () => {
      try {
        // Try to parse the response as JSON for logging
        const parsedBody = JSON.parse(responseBody);
        console.log(`Review service response body: ${JSON.stringify(parsedBody).substring(0, 200)}${responseBody.length > 200 ? '...' : ''}`);
      } catch (e) {
        // If not valid JSON, log as is
        console.log(`Review service raw response: ${responseBody.substring(0, 200)}${responseBody.length > 200 ? '...' : ''}`);
      }
    });
  },
  onError: (err, req, res) => {
    console.error(`Review service proxy error: ${err.message}`);
    res.status(500).json({ error: 'Review service unavailable' });
  }
}));

app.use('/users', authenticateJWT, createProxyMiddleware({
  target: USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/users': ''
  },
  onProxyReq: handleProxyRequest,
  onProxyRes: (proxyRes, req, res) => {
    console.log(`[${new Date().toISOString()}] User service responded with status: ${proxyRes.statusCode} for ${req.method} ${req.url}`);
    
    // Log response body for debugging
    let responseBody = '';
    proxyRes.on('data', (chunk) => {
      responseBody += chunk;
    });
    
    proxyRes.on('end', () => {
      try {
        // Try to parse the response as JSON for logging
        const parsedBody = JSON.parse(responseBody);
        console.log(`User service response body: ${JSON.stringify(parsedBody).substring(0, 200)}${responseBody.length > 200 ? '...' : ''}`);
      } catch (e) {
        // If not valid JSON, log as is
        console.log(`User service raw response: ${responseBody.substring(0, 200)}${responseBody.length > 200 ? '...' : ''}`);
      }
    });
  },
  onError: (err, req, res) => {
    console.error(`User service proxy error: ${err.message}`);
    res.status(500).json({ error: 'User service unavailable' });
  }
}));

// Add direct ping route for testing specific service connection
app.get('/ping-auth', async (req, res) => {
  try {
    const response = await axios.get(`${AUTH_SERVICE_URL}/health`, { timeout: 5000 });
    res.status(200).json({ 
      message: 'Successfully connected to Auth service',
      authServiceResponse: response.data
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to connect to Auth service', 
      details: error.message, 
      code: error.code 
    });
  }
});

// Add ping routes for other services
app.get('/ping-review', async (req, res) => {
  try {
    const response = await axios.get(`${REVIEW_SERVICE_URL}/health`, { timeout: 5000 });
    res.status(200).json({ 
      message: 'Successfully connected to Review service',
      reviewServiceResponse: response.data
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to connect to Review service', 
      details: error.message, 
      code: error.code 
    });
  }
});

// Add MQTT WebSocket endpoint info
app.get('/mqtt/info', (req, res) => {
  res.status(200).json({
    websocket_endpoint: 'ws://localhost:7500/mqtt',
    instructions: 'Connect to this WebSocket endpoint to access MQTT topics'
  });
});

// Catch-all route
app.use('*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down API gateway...');
  mqttClient.end(() => {
    console.log('MQTT client disconnected');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
