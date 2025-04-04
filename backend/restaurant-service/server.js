
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const morgan = require('morgan');
const mqtt = require('mqtt');

const app = express();
const PORT = process.env.PORT || 3002;

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize MQTT client
const mqttBrokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://mqtt-broker:1883';
console.log(`Connecting to MQTT broker at ${mqttBrokerUrl}`);
const mqttClient = mqtt.connect(mqttBrokerUrl);

// Store for recently received orders via MQTT to avoid processing duplicates
const recentOrdersCache = new Map();

// MQTT connection handling
mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');
  
  // Subscribe to order events
  mqttClient.subscribe('foodapp/orders/events/#', (err) => {
    if (!err) {
      console.log('Subscribed to order events');
    } else {
      console.error('Failed to subscribe to order events:', err);
    }
  });
  
  // Subscribe to restaurant-specific topics dynamically
  // This will be done when we get restaurant data
});

mqttClient.on('error', (err) => {
  console.error('MQTT connection error:', err);
});

mqttClient.on('message', (topic, message) => {
  console.log(`Received message on topic ${topic}: ${message.toString()}`);
  
  // Handle different topics
  try {
    const data = JSON.parse(message.toString());
    
    if (topic === 'foodapp/orders/events/created') {
      // Handle new order
      console.log('New order received via MQTT:', data.id);
      
      // Prevent duplicate processing by using a simple cache
      if (data.id && !recentOrdersCache.has(data.id)) {
        recentOrdersCache.set(data.id, { timestamp: Date.now() });
        
        // We could process the order here, notify staff, etc.
        console.log(`Restaurant service is processing new order ${data.id} for restaurant ${data.restaurant_id}`);
        
        // Clean up old cache entries every 100 orders
        if (recentOrdersCache.size > 100) {
          const now = Date.now();
          for (const [orderId, details] of recentOrdersCache.entries()) {
            if (now - details.timestamp > 3600000) { // 1 hour
              recentOrdersCache.delete(orderId);
            }
          }
        }
      }
    } 
    else if (topic === 'foodapp/orders/events/status_updated') {
      // Handle order status update
      console.log(`Order ${data.order?.id} status updated to ${data.newStatus}`);
    }
  } catch (error) {
    console.error('Error processing MQTT message:', error);
  }
});

// Middleware
app.use(cors());
app.use(express.json());
// Use verbose logging in development
app.use(morgan('dev'));

// Extended error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Authentication middleware with better error handling
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    console.log('Authentication failed: No authorization header');
    return res.status(401).json({ error: 'Authorization header is required' });
  }
  
  const token = authHeader.split(' ')[1];
  if (!token) {
    console.log('Authentication failed: Invalid token format');
    return res.status(401).json({ error: 'Invalid token format' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    console.log('User authenticated:', req.user.sub);
    next();
  } catch (err) {
    console.log('Authentication failed: Invalid token', err.message);
    return res.status(403).json({ error: 'Invalid or expired token', message: err.message });
  }
};

// Optional authentication middleware
const optionalAuthenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      console.log('User optionally authenticated:', req.user.sub);
    } catch (err) {
      console.log('Optional authentication failed:', err.message);
      // Continue anyway as authentication is optional
    }
  }
  
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    service: 'restaurant-service',
    mqtt: mqttClient.connected ? 'connected' : 'disconnected'
  });
});

// Restaurant routes
app.get('/', async (req, res) => {
  console.log('GET /restaurants - Fetching all restaurants');
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*');
      
    if (error) {
      console.error('Supabase error:', error);
      return res.status(400).json({ error: error.message });
    }
    
    console.log(`Successfully fetched ${data.length} restaurants`);
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

app.get('/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`GET /restaurants/${id} - Fetching restaurant by ID`);
  
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', id);
      
    if (error) {
      console.error('Supabase error:', error);
      return res.status(404).json({ error: 'Restaurant not found', details: error.message });
    }
    
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found', details: 'No restaurant with that ID' });
    }
    
    console.log('Successfully fetched restaurant:', data[0]);
    
    // Subscribe to restaurant-specific MQTT topics when we learn about a restaurant
    mqttClient.subscribe(`foodapp/restaurants/${id}/#`, (err) => {
      if (!err) {
        console.log(`Subscribed to MQTT topics for restaurant ${id}`);
      } else {
        console.error(`Failed to subscribe to MQTT topics for restaurant ${id}:`, err);
      }
    });
    
    res.status(200).json(data[0]);
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

app.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  console.log(`GET /restaurants/user/${userId} - Fetching restaurant by user ID`);
  
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('user_id', userId);
      
    if (error) {
      console.error('Supabase error:', error);
      return res.status(400).json({ error: error.message });
    }
    
    if (!data || data.length === 0) {
      console.log(`No restaurant found for user ID: ${userId}`);
      return res.status(404).json({ error: 'Restaurant not found for this user' });
    }
    
    console.log('Successfully fetched restaurant by user ID:', data[0]);
    
    // Subscribe to restaurant-specific MQTT topics
    const restaurantId = data[0].id;
    mqttClient.subscribe(`foodapp/restaurants/${restaurantId}/#`, (err) => {
      if (!err) {
        console.log(`Subscribed to MQTT topics for restaurant ${restaurantId}`);
      } else {
        console.error(`Failed to subscribe to MQTT topics for restaurant ${restaurantId}:`, err);
      }
    });
    
    res.status(200).json(data[0]);
  } catch (error) {
    console.error('Error fetching restaurant by user:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Modified route to create a restaurant with MQTT
app.post('/', authenticateJWT, async (req, res) => {
  try {
    const restaurantData = req.body;
    
    const { data, error } = await supabase
      .from('restaurants')
      .insert(restaurantData)
      .select()
      .single();
      
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    // Publish restaurant created event to MQTT
    console.log(`Publishing restaurant created event for restaurant ${data.id}`);
    mqttClient.publish('foodapp/restaurants/events/created', JSON.stringify(data));
    
    // Subscribe to this restaurant's MQTT topics
    mqttClient.subscribe(`foodapp/restaurants/${data.id}/#`, (err) => {
      if (!err) {
        console.log(`Subscribed to MQTT topics for restaurant ${data.id}`);
      } else {
        console.error(`Failed to subscribe to MQTT topics for restaurant ${data.id}:`, err);
      }
    });
    
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating restaurant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Modified route to update a restaurant with MQTT
app.put('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const { data, error } = await supabase
      .from('restaurants')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    // Publish restaurant updated event to MQTT
    console.log(`Publishing restaurant updated event for restaurant ${id}`);
    mqttClient.publish('foodapp/restaurants/events/updated', JSON.stringify(data));
    mqttClient.publish(`foodapp/restaurants/${id}/updated`, JSON.stringify(data));
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Error updating restaurant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Menu item routes 
app.get('/:restaurantId/menu', async (req, res) => {
  const { restaurantId } = req.params;
  console.log(`GET /restaurants/${restaurantId}/menu - Fetching menu items`);
  
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurantId);
      
    if (error) {
      console.error('Supabase error:', error);
      return res.status(400).json({ error: error.message });
    }
    
    console.log(`Successfully fetched ${data.length} menu items`);
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Modified route to create a menu item with MQTT
app.post('/menu-items', authenticateJWT, async (req, res) => {
  try {
    const menuItemData = req.body;
    
    const { data, error } = await supabase
      .from('menu_items')
      .insert(menuItemData)
      .select()
      .single();
      
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    // Publish menu item created event to MQTT
    console.log(`Publishing menu item created event for restaurant ${data.restaurant_id}`);
    mqttClient.publish('foodapp/menu-items/events/created', JSON.stringify(data));
    mqttClient.publish(`foodapp/restaurants/${data.restaurant_id}/menu/updated`, JSON.stringify({
      type: 'created',
      item: data
    }));
    
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Modified route to update a menu item with MQTT
app.put('/menu-items/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const { data, error } = await supabase
      .from('menu_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    // Publish menu item updated event to MQTT
    console.log(`Publishing menu item updated event for item ${id}`);
    mqttClient.publish('foodapp/menu-items/events/updated', JSON.stringify(data));
    mqttClient.publish(`foodapp/restaurants/${data.restaurant_id}/menu/updated`, JSON.stringify({
      type: 'updated',
      item: data
    }));
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Modified route to delete a menu item with MQTT
app.delete('/menu-items/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the menu item before deleting to know the restaurant_id
    const { data: menuItem, error: fetchError } = await supabase
      .from('menu_items')
      .select('restaurant_id')
      .eq('id', id)
      .single();
      
    if (fetchError) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id);
      
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    // Publish menu item deleted event to MQTT
    console.log(`Publishing menu item deleted event for item ${id}`);
    mqttClient.publish('foodapp/menu-items/events/deleted', JSON.stringify({
      id,
      restaurant_id: menuItem.restaurant_id
    }));
    mqttClient.publish(`foodapp/restaurants/${menuItem.restaurant_id}/menu/updated`, JSON.stringify({
      type: 'deleted',
      itemId: id
    }));
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down restaurant service...');
  mqttClient.end(() => {
    console.log('MQTT client disconnected');
    app.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Restaurant service running on port ${PORT}`);
});
