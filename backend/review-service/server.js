
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3004;

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Authentication middleware
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }
      
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

// Review routes
app.get('/', authenticateJWT, async (req, res) => {
  try {
    // Parse filter params
    const { userId, restaurantId, courierId } = req.query;
    
    let query = supabase.from('reviews').select('*');
      
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    if (restaurantId) {
      query = query.eq('restaurant_id', restaurantId);
    }
    
    if (courierId) {
      query = query.eq('courier_id', courierId);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
      
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/', authenticateJWT, async (req, res) => {
  try {
    const reviewData = req.body;
    
    const { error } = await supabase
      .from('reviews')
      .insert(reviewData);
      
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const reviewData = req.body;
    
    const { error } = await supabase
      .from('reviews')
      .update(reviewData)
      .eq('id', id);
      
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id);
      
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/check', authenticateJWT, async (req, res) => {
  try {
    const { userId, restaurantId, courierId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    let query = supabase
      .from('reviews')
      .select('id')
      .eq('user_id', userId);

    if (restaurantId) {
      query = query.eq('restaurant_id', restaurantId);
    }

    if (courierId) {
      query = query.eq('courier_id', courierId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(200).json({ 
      exists: data && data.length > 0,
      existingId: data && data.length > 0 ? data[0].id : null
    });
  } catch (error) {
    console.error('Error checking existing review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Review service running on port ${PORT}`);
});
