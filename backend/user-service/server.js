
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3005;

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

// User routes
app.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error(`User not found with id: ${id}`, error);
      
      // Instead of sending a 404, check if we can get user info from auth
      const { data: userData, error: authError } = await supabase.auth.admin.getUserById(id);
      
      if (authError || !userData) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Create a basic user record from auth data
      const basicUser = {
        id: userData.user.id,
        email: userData.user.email,
        name: userData.user.email.split('@')[0],
        address: '',
        lat: 0,
        lng: 0,
        user_type: 'customer' // Default type
      };
      
      // Try to insert this user
      const { error: insertError } = await supabase
        .from('users')
        .insert(basicUser);
        
      if (insertError) {
        console.error('Error creating missing user profile:', insertError);
        return res.status(404).json({ error: 'User not found and could not be created' });
      }
      
      return res.status(200).json(basicUser);
    }
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/email/:email', authenticateJWT, async (req, res) => {
  try {
    const { email } = req.params;
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
      
    if (error) {
      console.error(`User not found with email: ${email}`, error);
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching user by email:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/type/:userType', authenticateJWT, async (req, res) => {
  try {
    const { userType } = req.params;
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_type', userType);
      
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching users by type:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/:id/simple', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('users')
      .select('id, name, lat, lng')
      .eq('id', id)
      .single();
      
    if (error) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(200).json({
      id: data.id,
      name: data.name,
      lat: data.lat,
      lng: data.lng
    });
  } catch (error) {
    console.error('Error fetching simple user data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userData = req.body;
    
    // Check if user exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, user_type')
      .eq('id', id)
      .single();
      
    if (checkError) {
      console.log(`User ${id} does not exist, trying to create it`);
      
      // If user doesn't exist, try to insert it
      const { data: insertData, error: insertError } = await supabase
        .from('users')
        .insert({...userData, id})
        .select()
        .single();
        
      if (insertError) {
        console.error('Error inserting user:', insertError);
        return res.status(400).json({ error: insertError.message });
      }
      
      return res.status(201).json(insertData);
    }
    
    // User exists, update it
    const { data, error } = await supabase
      .from('users')
      .update(userData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating user:', error);
      return res.status(400).json({ error: error.message });
    }
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/:id/location', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lng } = req.body;
    
    const { data, error } = await supabase
      .from('users')
      .update({ lat, lng })
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Error updating user location:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', id)
      .single();
      
    if (userError) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Delete user from database
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
      
    if (deleteError) {
      return res.status(400).json({ error: deleteError.message });
    }
    
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`User service running on port ${PORT}`);
});
