
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3006;

// Middleware
app.use(express.json());
app.use(cors());

// Connect to Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Forbidden: Invalid token' });
  }
};

// Check if user is an employee
const checkEmployeeRole = (req, res, next) => {
  if (req.user && req.user.user_type === 'employee') {
    next();
  } else {
    return res.status(403).json({ error: 'Forbidden: Employee access required' });
  }
};

// Check if user is a developer
const checkDeveloperRole = (req, res, next) => {
  if (req.user && req.user.user_type === 'employee' && req.user.employee_role === 'developer') {
    next();
  } else {
    return res.status(403).json({ error: 'Forbidden: Developer access required' });
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'employee-service' });
});

// Employee API endpoints

// Get all users by type
app.get('/api/users/:type', authenticateToken, checkEmployeeRole, async (req, res) => {
  try {
    const { type } = req.params;
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_type', type);
      
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user by ID
app.get('/api/user/:id', authenticateToken, checkEmployeeRole, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user
app.put('/api/user/:id', authenticateToken, checkEmployeeRole, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select();
      
    if (error) throw error;
    
    res.json(data[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete user
app.delete('/api/user/:id', authenticateToken, checkEmployeeRole, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
    
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all orders
app.get('/api/orders', authenticateToken, checkEmployeeRole, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get order by ID
app.get('/api/order/:id', authenticateToken, checkEmployeeRole, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update order status
app.put('/api/order/:id/status', authenticateToken, checkEmployeeRole, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status
    const validStatuses = [
      'created', 'accepted_by_restaurant', 'preparing', 
      'ready_for_pickup', 'picked_up', 'on_the_way', 
      'delivered', 'completed', 'cancelled'
    ];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    
    const { data, error } = await supabase
      .from('orders')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();
      
    if (error) throw error;
    
    // Publish to MQTT or trigger webhook if needed for real-time updates
    
    res.json(data[0]);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get analytics data
app.get('/api/analytics', authenticateToken, checkEmployeeRole, async (req, res) => {
  try {
    // Get counts of different user types
    const { data: userCounts, error: userError } = await supabase
      .from('users')
      .select('user_type, count')
      .group('user_type');
    
    if (userError) throw userError;
    
    // Get order statistics
    const { data: orderStats, error: orderError } = await supabase
      .from('orders')
      .select('status, count')
      .group('status');
    
    if (orderError) throw orderError;
    
    // Get restaurant count
    const { count: restaurantCount, error: restError } = await supabase
      .from('restaurants')
      .select('*', { count: 'exact', head: true });
    
    if (restError) throw restError;
    
    // Get total orders by day (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: dailyOrders, error: dailyError } = await supabase
      .from('orders')
      .select('created_at')
      .gte('created_at', sevenDaysAgo.toISOString());
      
    if (dailyError) throw dailyError;
    
    // Process daily orders into a chart-friendly format
    const dailyOrderCounts = {};
    const today = new Date();
    
    // Initialize with zeros for the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      dailyOrderCounts[dateString] = 0;
    }
    
    // Count orders per day
    dailyOrders.forEach(order => {
      const dateString = order.created_at.split('T')[0];
      if (dailyOrderCounts[dateString] !== undefined) {
        dailyOrderCounts[dateString]++;
      }
    });
    
    // Convert to array format for charts
    const orderTrends = Object.entries(dailyOrderCounts).map(([date, count]) => ({
      date,
      count
    }));
    
    res.json({
      userCounts,
      orderStats,
      restaurantCount,
      orderTrends
    });
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get detailed user growth data (for developers only)
app.get('/api/analytics/user-growth', authenticateToken, checkDeveloperRole, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('created_at, user_type')
      .order('created_at', { ascending: true });
      
    if (error) throw error;
    
    // Process data by month and user type
    const userGrowth = {};
    
    data.forEach(user => {
      const monthYear = user.created_at.substring(0, 7); // YYYY-MM format
      
      if (!userGrowth[monthYear]) {
        userGrowth[monthYear] = {
          customer: 0,
          restaurant: 0,
          courier: 0,
          employee: 0,
          total: 0
        };
      }
      
      userGrowth[monthYear][user.user_type]++;
      userGrowth[monthYear].total++;
    });
    
    // Convert to array format for charts
    const result = Object.entries(userGrowth).map(([month, counts]) => ({
      month,
      ...counts
    }));
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching user growth data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get system metadata (for developers only)
app.get('/api/system/metadata', authenticateToken, checkDeveloperRole, async (req, res) => {
  try {
    // Database table counts
    const tablePromises = [
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('restaurants').select('*', { count: 'exact', head: true }),
      supabase.from('menu_items').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('reviews').select('*', { count: 'exact', head: true })
    ];
    
    const [users, restaurants, menuItems, orders, reviews] = await Promise.all(tablePromises);
    
    res.json({
      database: {
        tables: {
          users: users.count,
          restaurants: restaurants.count,
          menu_items: menuItems.count,
          orders: orders.count,
          reviews: reviews.count
        }
      },
      system: {
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime()
      }
    });
  } catch (error) {
    console.error('Error fetching system metadata:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Employee service running on port ${PORT}`);
});
