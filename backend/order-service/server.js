const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const morgan = require('morgan');
const { Server } = require('socket.io');
const http = require('http');
const mqtt = require('mqtt');

const app = express();
const PORT = process.env.PORT || 3003;

// Create HTTP server for Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize MQTT client
const mqttBrokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://mqtt-broker:1883';
console.log(`Connecting to MQTT broker at ${mqttBrokerUrl}`);
const mqttClient = mqtt.connect(mqttBrokerUrl);

// MQTT connection handling
mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');
  
  // Subscribe to relevant topics
  mqttClient.subscribe('foodapp/orders/commands/#', (err) => {
    if (!err) {
      console.log('Subscribed to order commands');
    } else {
      console.error('Failed to subscribe to order commands:', err);
    }
  });
});

mqttClient.on('error', (err) => {
  console.error('MQTT connection error:', err);
});

mqttClient.on('message', (topic, message) => {
  console.log(`Received message on topic ${topic}: ${message.toString()}`);
  
  // Handle incoming MQTT messages
  if (topic.startsWith('foodapp/orders/commands/')) {
    try {
      const command = JSON.parse(message.toString());
      console.log('Received command:', command);
      
      // Process different command types
      if (command.type === 'status_update' && command.orderId && command.status) {
        console.log(`Processing status update for order ${command.orderId} to ${command.status}`);
        // This would normally update the database, but for now we'll just publish the result
        mqttClient.publish(`foodapp/orders/events/status_updated`, JSON.stringify({
          orderId: command.orderId,
          status: command.status,
          timestamp: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error('Error processing MQTT message:', error);
    }
  }
});

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(morgan('dev'));

// Add detailed request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ORDER SERVICE: ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request body:', req.body);
  }
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    service: 'order-service',
    mqtt: mqttClient.connected ? 'connected' : 'disconnected'
  });
});

// Authentication middleware
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    
    // Log token for debugging (never do this in production)
    console.log(`Received token: ${token.substring(0, 15)}...`);
    
    jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_here', (err, user) => {
      if (err) {
        console.error('JWT verification error:', err.message);
        return res.status(403).json({ error: 'Token verification failed', details: err.message });
      }
      
      req.user = user;
      console.log('User authenticated:', req.user);
      next();
    });
  } else {
    console.log('No authorization header provided');
    res.status(401).json({ error: 'Authorization header required' });
  }
};

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join', (orderId) => {
    socket.join(orderId);
    console.log(`User ${socket.id} joined room ${orderId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Order routes
app.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Fetching order with ID: ${id}`);
    
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('id', id)
      .single();
      
    if (error) {
      console.error('Error fetching order by ID:', error);
      return res.status(404).json({ error: 'Order not found' });
    }
    
    console.log(`Order data found: ${JSON.stringify(data).substring(0, 200)}...`);
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/user/:userId', authenticateJWT, async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`Fetching orders for user: ${userId}`);
    
    const { data, error } = await supabase
      .from('orders')
      .select(`*`)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching user orders:', error);
      return res.status(400).json({ error: error.message });
    }
    
    console.log(`Found ${data?.length || 0} orders for user ${userId}`);
    
    // Get order items
    const ordersWithItems = await Promise.all((data || []).map(async (order) => {
      try {
        // Check if items is already parsed JSON
        let orderItems = [];
        if (typeof order.items === 'string') {
          try {
            orderItems = JSON.parse(order.items);
          } catch (e) {
            console.error('Error parsing order items JSON:', e);
            orderItems = [];
          }
        } else if (Array.isArray(order.items)) {
          orderItems = order.items;
        }
        
        return {
          ...order,
          items: orderItems
        };
      } catch (error) {
        console.error(`Error processing order ${order.id}:`, error);
        return order;
      }
    }));
    
    res.status(200).json(ordersWithItems);
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/restaurant/:restaurantId', authenticateJWT, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    console.log(`Fetching orders for restaurant: ${restaurantId}`);
    
    const { data, error } = await supabase
      .from('orders')
      .select(`*`)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching restaurant orders:', error);
      return res.status(400).json({ error: error.message });
    }
    
    console.log(`Found ${data?.length || 0} orders for restaurant ${restaurantId}`);
    
    // Process orders to ensure items are properly formatted
    const processedOrders = (data || []).map(order => {
      let parsedItems = [];
      
      try {
        if (typeof order.items === 'string') {
          parsedItems = JSON.parse(order.items);
        } else if (Array.isArray(order.items)) {
          parsedItems = order.items;
        } else if (order.items && typeof order.items === 'object') {
          // If it's already a JSON object but not an array
          parsedItems = [order.items];
        }
      } catch (e) {
        console.error(`Error parsing items for order ${order.id}:`, e);
      }
      
      return {
        ...order,
        items: parsedItems
      };
    });
    
    res.status(200).json(processedOrders);
  } catch (error) {
    console.error('Error fetching restaurant orders:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

app.get('/courier/:courierId', authenticateJWT, async (req, res) => {
  try {
    const { courierId } = req.params;
    
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('courier_id', courierId)
      .order('created_at', { ascending: false });
      
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching courier orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/status/:status', authenticateJWT, async (req, res) => {
  try {
    const { status } = req.params;
    const statusArray = status.split(',');
    
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .in('status', statusArray)
      .order('created_at', { ascending: false });
      
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching orders by status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate a random 4-digit PIN
const generatePin = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Modified route to create an order with MQTT
app.post('/', authenticateJWT, async (req, res) => {
  try {
    const orderData = req.body;
    const { order_items, ...orderDetails } = orderData;
    
    console.log('Creating new order with data:', JSON.stringify(orderDetails));
    
    // Generate a 4-digit PIN for delivery confirmation
    const deliveryPin = generatePin();
    
    // Create the order with the PIN
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({ 
        ...orderDetails, 
        status: 'pending',
        delivery_pin: deliveryPin 
      })
      .select()
      .single();
      
    if (orderError) {
      console.error('Error creating order:', orderError);
      return res.status(400).json({ error: orderError.message });
    }
    
    // Create order items
    if (order_items && order_items.length > 0) {
      const orderItemsWithOrderId = order_items.map(item => ({
        ...item,
        order_id: order.id
      }));
      
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsWithOrderId);
        
      if (itemsError) {
        console.error('Error creating order items:', itemsError);
        return res.status(400).json({ error: itemsError.message });
      }
    }
    
    // Publish new order event to MQTT
    console.log(`Publishing new order event for order ${order.id}`);
    mqttClient.publish('foodapp/orders/events/created', JSON.stringify(order));
    
    // Restaurant-specific topic
    mqttClient.publish(`foodapp/restaurants/${order.restaurant_id}/orders`, JSON.stringify(order));
    
    // Notify Socket.IO clients (maintaining backward compatibility)
    io.to(order.restaurant_id).emit('new_order', order);
    
    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// New route to verify delivery PIN
app.post('/:orderId/verify-pin', authenticateJWT, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { pin } = req.body;
    
    console.log(`Verifying delivery PIN for order ${orderId}`);
    
    if (!pin) {
      return res.status(400).json({
        success: false,
        message: 'PIN is required'
      });
    }
    
    // Fetch the order to verify the PIN
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
      
    if (orderError || !order) {
      console.error('Error fetching order:', orderError);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Verify the PIN
    if (order.delivery_pin !== pin) {
      console.log(`PIN verification failed for order ${orderId}. Expected: ${order.delivery_pin}, Received: ${pin}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid PIN'
      });
    }
    
    // Update the order status to 'delivered'
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'delivered',
        updated_at: new Date()
      })
      .eq('id', orderId)
      .select()
      .single();
      
    if (updateError) {
      console.error('Error updating order status:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update order status'
      });
    }
    
    // Publish order status update to MQTT
    console.log(`Publishing delivery confirmation for order ${orderId}`);
    mqttClient.publish('foodapp/orders/events/status_updated', JSON.stringify({
      order: updatedOrder,
      previousStatus: order.status,
      newStatus: 'delivered',
      timestamp: new Date().toISOString()
    }));
    
    // Order-specific topic
    mqttClient.publish(`foodapp/orders/${orderId}/status`, JSON.stringify({
      status: 'delivered',
      timestamp: new Date().toISOString()
    }));
    
    // User-specific topic if user_id exists
    if (updatedOrder.user_id) {
      mqttClient.publish(`foodapp/users/${updatedOrder.user_id}/orders/${orderId}/status`, JSON.stringify({
        status: 'delivered',
        timestamp: new Date().toISOString()
      }));
    }
    
    // Notify Socket.IO clients
    io.to(orderId).emit('order_updated', updatedOrder);
    if (updatedOrder.user_id) {
      io.to(updatedOrder.user_id).emit('order_updated', updatedOrder);
    }
    if (updatedOrder.courier_id) {
      io.to(updatedOrder.courier_id).emit('order_updated', updatedOrder);
    }
    
    // Return success
    res.status(200).json({
      success: true,
      message: 'Delivery confirmed successfully',
      order: updatedOrder
    });
  } catch (error) {
    console.error('Error verifying delivery PIN:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      details: error.message
    });
  }
});

// Modified route to update order status with MQTT
app.put('/:orderId/status', authenticateJWT, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    console.log(`Updating order ${orderId} status to ${status}`);
    
    const { data, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date() })
      .eq('id', orderId)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating order status:', error);
      return res.status(400).json({ error: error.message });
    }
    
    // Publish order status update to MQTT
    console.log(`Publishing status update for order ${orderId} to ${status}`);
    mqttClient.publish('foodapp/orders/events/status_updated', JSON.stringify({
      order: data,
      previousStatus: req.body.previousStatus || null,
      newStatus: status,
      timestamp: new Date().toISOString()
    }));
    
    // Order-specific topic
    mqttClient.publish(`foodapp/orders/${orderId}/status`, JSON.stringify({
      status,
      timestamp: new Date().toISOString()
    }));
    
    // User-specific topic if user_id exists
    if (data.user_id) {
      mqttClient.publish(`foodapp/users/${data.user_id}/orders/${orderId}/status`, JSON.stringify({
        status,
        timestamp: new Date().toISOString()
      }));
    }
    
    // Notify Socket.IO clients (maintaining backward compatibility)
    io.to(orderId).emit('order_updated', data);
    io.to(data.user_id).emit('order_updated', data);
    
    if (data.courier_id) {
      io.to(data.courier_id).emit('order_updated', data);
    }
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Modified route to assign courier with MQTT
app.put('/:orderId/courier', authenticateJWT, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { courier_id } = req.body;
    
    console.log(`Assigning courier ${courier_id} to order ${orderId}`);
    
    const { data, error } = await supabase
      .from('orders')
      .update({ 
        courier_id,
        status: 'assigned',
        updated_at: new Date()
      })
      .eq('id', orderId)
      .select()
      .single();
      
    if (error) {
      console.error('Error assigning courier:', error);
      return res.status(400).json({ error: error.message });
    }
    
    // Publish courier assignment to MQTT
    console.log(`Publishing courier assignment for order ${orderId} to courier ${courier_id}`);
    mqttClient.publish('foodapp/orders/events/courier_assigned', JSON.stringify({
      order: data,
      courierId: courier_id,
      timestamp: new Date().toISOString()
    }));
    
    // Courier-specific topic
    mqttClient.publish(`foodapp/couriers/${courier_id}/assignments`, JSON.stringify({
      orderId,
      restaurantId: data.restaurant_id,
      timestamp: new Date().toISOString()
    }));
    
    // Notify Socket.IO clients (maintaining backward compatibility)
    io.to(orderId).emit('order_updated', data);
    io.to(data.user_id).emit('order_updated', data);
    io.to(courier_id).emit('order_assigned', data);
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Error assigning courier:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down order service...');
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
  console.log(`Order service running on port ${PORT}`);
});
