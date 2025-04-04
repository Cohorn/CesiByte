
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3002;

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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
      .eq('id', id)
      .single();
      
    if (error) {
      console.error('Supabase error:', error);
      return res.status(404).json({ error: 'Restaurant not found', details: error.message });
    }
    
    console.log('Successfully fetched restaurant:', data);
    res.status(200).json(data);
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
      .eq('user_id', userId)
      .single();
      
    if (error) {
      console.error('Supabase error:', error);
      if (error.code === 'PGRST116') {
        // No rows returned
        return res.status(404).json({ error: 'Restaurant not found for this user' });
      }
      return res.status(400).json({ error: error.message });
    }
    
    console.log('Successfully fetched restaurant by user ID:', data);
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching restaurant by user:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

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
    
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating restaurant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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
    
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/menu-items/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id);
      
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Restaurant service running on port ${PORT}`);
});
