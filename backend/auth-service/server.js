
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3001;

// More detailed logging
morgan.token('request-body', (req) => {
  return JSON.stringify(req.body);
});

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log('Auth service initializing with Supabase URL:', supabaseUrl);

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Supabase URL or key is missing!');
  console.error(`SUPABASE_URL: ${supabaseUrl ? '[SET]' : '[MISSING]'}`);
  console.error(`SUPABASE_KEY: ${supabaseKey ? '[SET]' : '[MISSING]'}`);
  // Don't exit - continue running but log the error
}

const supabase = createClient(
  supabaseUrl || 'https://ukrukdqjvvsvfvmqzxdv.supabase.co',
  supabaseKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcnVrZHFqdnZzdmZ2bXF6eGR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0MDYxMTcsImV4cCI6MjA1ODk4MjExN30.V9T0HKUznzB1Gp1_RpwrDADDWfvRXdtehx5y0u6hK4c',
  {
    auth: {
      persistSession: false
    }
  }
);

// Test Supabase connection
(async () => {
  try {
    console.log('Testing Supabase connection...');
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      console.error('ERROR connecting to Supabase:', error.message);
      console.error('Supabase error details:', error);
    } else {
      console.log('Successfully connected to Supabase');
    }
  } catch (err) {
    console.error('ERROR connecting to Supabase:', err);
  }
})();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '2mb' }));
app.use(morgan(':method :url :status :response-time ms - :res[content-length] :request-body'));

// Helper to generate JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, user_type: user.user_type },
    process.env.JWT_SECRET || 'your_jwt_secret_here',
    { expiresIn: '7d' }
  );
};

// Enhanced health check route
app.get('/health', (req, res) => {
  console.log('Health check received');
  res.status(200).json({ 
    status: 'ok',
    service: 'auth-service',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.post('/login', async (req, res) => {
  try {
    console.log('Login request received:', req.body);
    
    if (!req.body) {
      console.error('Request body is missing');
      return res.status(400).json({ error: 'Request body is missing' });
    }
    
    const { email, password } = req.body;
    
    console.log('Login credentials extracted:', { email, password: '***' });
    
    if (!email || !password) {
      console.error('Missing credentials');
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    console.log('Signing in with Supabase...');
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (authError) {
      console.error('Login authentication error:', authError);
      return res.status(401).json({ error: authError.message });
    }
    
    console.log('Supabase auth successful, fetching user data...');
    
    // Get user data from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
      
    if (userError) {
      console.error('User profile lookup error:', userError);
      
      // Instead of returning 404, create a basic user profile based on auth data
      // This fixes situations where auth exists but profile doesn't
      const userId = authData.user.id;
      console.log('Creating fallback user profile for userId:', userId);
      
      const defaultUserData = {
        id: userId,
        email: email,
        name: email.split('@')[0], // Use email username as name
        address: '',
        lat: 0,
        lng: 0,
        user_type: 'customer' // Default type
      };
      
      // Try to insert the user
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert(defaultUserData)
        .select()
        .single();
      
      if (insertError) {
        console.error('Failed to create fallback user profile:', insertError);
        return res.status(500).json({ error: 'Failed to create user profile' });
      }
      
      // Generate token with the new user data
      const token = generateToken(newUser);
      
      console.log('Created fallback profile, login successful for user:', newUser.id);
      
      return res.status(200).json({
        token,
        user: newUser,
      });
    }
    
    // Generate token
    const token = generateToken(userData);
    
    console.log('Login successful for user:', userData.id);
    
    res.status(200).json({
      token,
      user: userData,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

app.post('/register', async (req, res) => {
  try {
    console.log('Register request received:', req.body);
    const { email, password, name, address, lat, lng, user_type } = req.body;
    
    // Explicitly check and validate the user_type
    console.log('Validating user_type:', user_type);
    
    // Validate the user_type to make sure it's one of the accepted values
    const validUserTypes = ['customer', 'restaurant', 'courier', 'employee'];
    if (!validUserTypes.includes(user_type)) {
      console.error(`Invalid user_type provided: ${user_type}`);
      return res.status(400).json({ 
        error: `Invalid user_type: ${user_type}. Must be one of: ${validUserTypes.join(', ')}` 
      });
    }
    
    console.log('User data validation passed, proceeding with registration');
    
    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (authError) {
      console.error('Registration auth error:', authError);
      return res.status(400).json({ error: authError.message });
    }
    
    // Create profile in users table
    if (authData.user) {
      // Prepare user profile data
      const userProfile = {
        id: authData.user.id,
        email,
        name: name || '',
        user_type: user_type
      };
      
      // Handle employee vs non-employee data differently
      if (user_type === 'employee') {
        // For employees, set empty address and 0 coordinates
        userProfile.address = '';
        userProfile.lat = 0;
        userProfile.lng = 0;
      } else {
        // For non-employees, include address and location
        userProfile.address = address || '';
        userProfile.lat = lat || 0;
        userProfile.lng = lng || 0;
      }
      
      console.log('Creating user profile:', userProfile);
      
      // Insert the user profile
      const { data: newUser, error: profileError } = await supabase
        .from('users')
        .insert(userProfile)
        .select()
        .single();
        
      if (profileError) {
        console.error('Profile creation error:', profileError);
        return res.status(400).json({ error: profileError.message });
      }

      // Verify the created user has the right user_type (for debugging)
      if (user_type === 'employee') {
        const { data: verifyUser, error: verifyError } = await supabase
          .from('users')
          .select('*')
          .eq('id', newUser.id)
          .single();
          
        if (!verifyError) {
          console.log('Verified created user:', verifyUser);
          console.log('User type set correctly:', verifyUser.user_type);
        }
      }
      
      // Generate token
      const token = generateToken(newUser);
      
      console.log('Registration successful for user:', newUser.id);
      
      res.status(201).json({
        token,
        user: newUser,
      });
    } else {
      console.error('No user data returned from auth signup');
      res.status(500).json({ error: 'Failed to create user' });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

app.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_here');
      
      // Get user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', decoded.id)
        .single();
        
      if (userError) {
        console.error('User lookup error in /me:', userError);
        // Return the basic user info from the token instead of 404
        return res.status(200).json({
          id: decoded.id,
          email: decoded.email,
          user_type: decoded.user_type,
          name: '',
          address: '',
          lat: 0,
          lng: 0
        });
      }
      
      res.status(200).json(userData);
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      return res.status(403).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;
    
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
      
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Debug route to test API Gateway connectivity
app.get('/ping', (req, res) => {
  console.log('Ping request received');
  res.status(200).json({ message: 'pong', timestamp: new Date().toISOString() });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Auth service running on port ${PORT}`);
  console.log(`Auth service health check available at http://localhost:${PORT}/health`);
});
