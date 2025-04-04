const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const morgan = require('morgan');
const { Server } = require('socket.io');
const http = require('http');

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
  res.status(200).json({ status: 'ok', service: 'order-service' });
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

app.post('/', authenticateJWT, async (req, res) => {
  try {
    const orderData = req.body;
    const { order_items, ...orderDetails } = orderData;
    
    // Create the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({ ...orderDetails, status: 'pending' })
      .select()
      .single();
      
    if (orderError) {
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
        return res.status(400).json({ error: itemsError.message });
      }
    }
    
    // Notify clients via Socket.IO
    io.to(order.restaurant_id).emit('new_order', order);
    
    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/:orderId/status', authenticateJWT, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    const { data, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date() })
      .eq('id', orderId)
      .select()
      .single();
      
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    // Notify clients via Socket.IO
    io.to(orderId).emit('order_updated', data);
    io.to(data.user_id).emit('order_updated', data);
    
    if (data.courier_id) {
      io.to(data.courier_id).emit('order_updated', data);
    }
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/:orderId/courier', authenticateJWT, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { courier_id } = req.body;
    
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
      return res.status(400).json({ error: error.message });
    }
    
    // Notify clients via Socket.IO
    io.to(orderId).emit('order_updated', data);
    io.to(data.user_id).emit('order_updated', data);
    io.to(courier_id).emit('order_assigned', data);
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Error assigning courier:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server
server.listen(PORT, () => {
  console.log(`Order service running on port ${PORT}`);
});
