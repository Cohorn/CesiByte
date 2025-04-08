
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

// IMPORTANT: These specific routes must come BEFORE the :id route
// Handle checking for existing reviews
app.get('/reviews/check', authenticateJWT, async (req, res) => {
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

// Calculate average rating
app.get('/reviews/average', authenticateJWT, async (req, res) => {
  try {
    const { restaurantId, courierId } = req.query;
    
    let query = supabase.from('reviews').select('rating');
      
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
    
    if (!data || data.length === 0) {
      return res.status(200).json({ average: 0, count: 0 });
    }
    
    const sum = data.reduce((acc, review) => acc + review.rating, 0);
    const average = sum / data.length;
    
    res.status(200).json({ average, count: data.length });
  } catch (error) {
    console.error('Error calculating average rating:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Review routes for collection
app.get('/reviews', authenticateJWT, async (req, res) => {
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

// This route must come AFTER the specific /reviews/check and /reviews/average routes
app.get('/reviews/:id', authenticateJWT, async (req, res) => {
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

app.post('/reviews', authenticateJWT, async (req, res) => {
  try {
    const reviewData = req.body;
    
    // First check if a review already exists from this user for this courier/restaurant
    let query = supabase
      .from('reviews')
      .select('id')
      .eq('user_id', reviewData.user_id);
      
    if (reviewData.courier_id) {
      query = query.eq('courier_id', reviewData.courier_id);
    }
    
    if (reviewData.restaurant_id) {
      query = query.eq('restaurant_id', reviewData.restaurant_id);
    }
    
    const { data: existingReview, error: findError } = await query;
    
    if (findError) {
      return res.status(400).json({ error: findError.message });
    }
    
    // If review exists, update it instead of creating a new one
    if (existingReview && existingReview.length > 0) {
      const { error: updateError } = await supabase
        .from('reviews')
        .update({
          rating: reviewData.rating,
          comment: reviewData.comment
        })
        .eq('id', existingReview[0].id);
        
      if (updateError) {
        return res.status(400).json({ error: updateError.message });
      }
      
      // Get the updated review to return
      const { data: updatedReview, error: fetchError } = await supabase
        .from('reviews')
        .select('*')
        .eq('id', existingReview[0].id)
        .single();
        
      if (fetchError) {
        return res.status(400).json({ error: fetchError.message });
      }
      
      return res.status(200).json(updatedReview);
    }
    
    // Otherwise, create a new review
    const { data: newReview, error: insertError } = await supabase
      .from('reviews')
      .insert(reviewData)
      .select()
      .single();
      
    if (insertError) {
      return res.status(400).json({ error: insertError.message });
    }
    
    res.status(201).json(newReview);
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/reviews/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const reviewData = req.body;
    
    const { data, error } = await supabase
      .from('reviews')
      .update(reviewData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/reviews/:id', authenticateJWT, async (req, res) => {
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

// Start the server
app.listen(PORT, () => {
  console.log(`Review service running on port ${PORT}`);
});
