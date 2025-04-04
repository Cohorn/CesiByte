
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
    
    res.json({
      userCounts,
      orderStats,
      restaurantCount
    });
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Employee service running on port ${PORT}`);
});

