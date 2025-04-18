const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const morgan = require('morgan');
const mqtt = require('mqtt');

const app = express();
const PORT = process.env.PORT || 3005;

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
  
  // Subscribe to user events
  mqttClient.subscribe('foodapp/users/events/#', (err) => {
    if (!err) {
      console.log('Subscribed to user events');
    } else {
      console.error('Failed to subscribe to user events:', err);
    }
  });
  
  // Subscribe to courier events
  mqttClient.subscribe('foodapp/couriers/events/#', (err) => {
    if (!err) {
      console.log('Subscribed to courier events');
    } else {
      console.error('Failed to subscribe to courier events:', err);
    }
  });
});

mqttClient.on('error', (err) => {
  console.error('MQTT connection error:', err);
});

mqttClient.on('message', (topic, message) => {
  console.log(`Received message on topic ${topic}: ${message.toString()}`);
  
  // Process messages as needed
  try {
    const data = JSON.parse(message.toString());
    
    if (topic === 'foodapp/couriers/events/location_update') {
      // Handle courier location update
      console.log(`Courier ${data.courierId} location updated: ${data.lat}, ${data.lng}`);
      
      // We could update the database here, but that would duplicate 
      // what our API endpoint already does
    }
  } catch (error) {
    console.error('Error processing MQTT message:', error);
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    service: 'user-service',
    mqtt: mqttClient.connected ? 'connected' : 'disconnected'
  });
});

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

// Modified route to update a user with MQTT notification
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
      
      // Publish user created event to MQTT
      console.log(`Publishing user created event for user ${id}`);
      mqttClient.publish('foodapp/users/events/created', JSON.stringify({
        id,
        userType: userData.user_type
      }));
      
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
    
    // Publish user updated event to MQTT
    console.log(`Publishing user updated event for user ${id}`);
    mqttClient.publish('foodapp/users/events/updated', JSON.stringify({
      id,
      userType: data.user_type
    }));
    
    // If this is a courier, publish a special courier update
    if (data.user_type === 'courier') {
      mqttClient.publish('foodapp/couriers/events/updated', JSON.stringify({
        id,
        name: data.name,
        lat: data.lat,
        lng: data.lng
      }));
    }
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Modified route to update user location with MQTT notification
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
    
    // Publish location update to MQTT
    console.log(`Publishing location update for user ${id}`);
    mqttClient.publish('foodapp/users/events/location_update', JSON.stringify({
      userId: id,
      lat,
      lng,
      timestamp: new Date().toISOString()
    }));
    
    // If this is a courier, publish to courier-specific topic
    if (data.user_type === 'courier') {
      mqttClient.publish('foodapp/couriers/events/location_update', JSON.stringify({
        courierId: id,
        lat,
        lng,
        timestamp: new Date().toISOString()
      }));
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
    
    console.log(`Received delete request for user: ${id}`);
    
    // Check if user exists
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, user_type')
      .eq('id', id)
      .single();
      
    if (userError) {
      console.log(`User ${id} not found, may already be deleted`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log(`Found user ${id} with type: ${userData.user_type}`);
    
    // Special handling for restaurant users due to foreign key constraints
    if (userData.user_type === 'restaurant') {
      console.log(`User ${id} is a restaurant owner, checking for restaurant data`);
      
      // Check for restaurant data
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('id')
        .eq('user_id', id);
        
      if (!restaurantError && restaurantData && restaurantData.length > 0) {
        console.log(`Found restaurant data for user ${id}, attempting to delete first`);
        
        // Delete restaurant data first to avoid foreign key constraint issues
        for (const restaurant of restaurantData) {
          // Delete menu items
          const { error: menuError } = await supabase
            .from('menu_items')
            .delete()
            .eq('restaurant_id', restaurant.id);
            
          if (menuError) {
            console.error(`Error deleting menu items for restaurant ${restaurant.id}:`, menuError);
          }
          
          // Delete restaurant orders
          const { error: orderError } = await supabase
            .from('orders')
            .delete()
            .eq('restaurant_id', restaurant.id);
            
          if (orderError) {
            console.error(`Error deleting orders for restaurant ${restaurant.id}:`, orderError);
          }
          
          // Delete restaurant reviews
          const { error: reviewError } = await supabase
            .from('reviews')
            .delete()
            .eq('restaurant_id', restaurant.id);
            
          if (reviewError) {
            console.error(`Error deleting reviews for restaurant ${restaurant.id}:`, reviewError);
          }
        }
        
        // Now delete the restaurant record
        const { error: deleteRestaurantError } = await supabase
          .from('restaurants')
          .delete()
          .eq('user_id', id);
          
        if (deleteRestaurantError) {
          console.error(`Error deleting restaurant for user ${id}:`, deleteRestaurantError);
          return res.status(400).json({ error: deleteRestaurantError.message });
        }
        
        console.log(`Successfully deleted restaurant data for user ${id}`);
      }
    }
    
    // Also clean up any orders or reviews associated with this user
    console.log(`Cleaning up related data for user ${id}`);
    
    // Delete user orders
    await supabase
      .from('orders')
      .delete()
      .eq('user_id', id);
      
    // Delete user reviews
    await supabase
      .from('reviews')
      .delete()
      .eq('user_id', id);
      
    // Delete any orders where user is a courier
    await supabase
      .from('orders')
      .delete()
      .eq('courier_id', id);
    
    // Delete any reviews for the user as a courier
    await supabase
      .from('reviews')
      .delete()
      .eq('courier_id', id);
      
    // Finally delete user from database
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
      
    if (deleteError) {
      console.error(`Error deleting user ${id}:`, deleteError);
      return res.status(400).json({ error: deleteError.message });
    }

    // Now also delete the user from auth.users using admin functionality
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(id);
    
    if (authDeleteError) {
      console.error('Error deleting user from auth system:', authDeleteError);
      // Continue anyway as we've deleted the user profile
      console.log('User profile deleted but auth account could not be removed');
    }
    
    // Publish user deleted event to MQTT
    console.log(`Publishing user deleted event for user ${id}`);
    mqttClient.publish('foodapp/users/events/deleted', JSON.stringify({
      userId: id,
      userType: userData.user_type
    }));
    
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down user service...');
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
  console.log(`User service running on port ${PORT}`);
});
