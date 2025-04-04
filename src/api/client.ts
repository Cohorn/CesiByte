
import axios from 'axios';
import { supabase } from '@/lib/supabase';

// Create an API client instance
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:7500',
  headers: {
    'Content-Type': 'application/json',
  },
  // Add timeout to prevent hanging requests
  timeout: 10000,
});

// Track last request times to implement rate limiting
const lastRequestTimes = new Map<string, number>();
const MIN_REQUEST_INTERVAL = 5000; // 5 seconds minimum between identical requests

// Log API request for debugging
apiClient.interceptors.request.use(async (config) => {
  const requestKey = `${config.method?.toUpperCase()}:${config.url}`;
  const now = Date.now();
  const lastRequestTime = lastRequestTimes.get(requestKey);
  
  // Implement rate limiting for identical requests
  if (lastRequestTime && (now - lastRequestTime < MIN_REQUEST_INTERVAL)) {
    console.log(`Rate limiting request ${requestKey} (last request ${now - lastRequestTime}ms ago)`);
    return Promise.reject({
      isRateLimited: true,
      message: 'Too many requests, please try again later',
    });
  }
  
  console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
  lastRequestTimes.set(requestKey, now);
  return config;
});

// Add auth token to API requests
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // Try to get session from Supabase
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      
      if (token) {
        console.log('Adding auth token to request');
        config.headers['Authorization'] = `Bearer ${token}`;
      } else {
        // Try to get token from localStorage as fallback
        const localToken = localStorage.getItem('auth_token');
        if (localToken) {
          console.log('Using local auth token for request');
          config.headers['Authorization'] = `Bearer ${localToken}`;
        } else {
          console.log('No auth token found');
        }
      }
      
      return config;
    } catch (error) {
      console.error('Error getting auth token:', error);
      
      // Try to get token from localStorage as fallback if Supabase fails
      try {
        const localToken = localStorage.getItem('auth_token');
        if (localToken) {
          console.log('Using local auth token after Supabase error');
          config.headers['Authorization'] = `Bearer ${localToken}`;
        }
      } catch (e) {
        console.error('Error accessing localStorage:', e);
      }
      
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Log API responses for debugging and handle rate limiting
apiClient.interceptors.response.use(
  (response) => {
    console.log(`API Response from ${response.config.url}:`, response.status);
    return response;
  },
  (error) => {
    if (error.isRateLimited) {
      console.log('Request was rate limited:', error.message);
      return Promise.reject(error);
    }
    
    if (error.response) {
      console.error(
        `API Error ${error.response.status} from ${error.config?.url}:`, 
        error.response.data
      );
      
      // Print more detailed request information to help debugging
      console.error('Request details:', {
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL,
        headers: error.config?.headers,
        params: error.config?.params,
        data: error.config?.data ? JSON.stringify(error.config.data).substring(0, 200) : 'No data'
      });
      
      // Check if error is due to authentication
      if (error.response.status === 401) {
        console.error('Authentication error - user might need to log in again');
      }
    } else if (error.request) {
      console.error(`API No Response from ${error.config?.url}:`, error.request);
      console.error('Request that failed:', {
        method: error.config?.method,
        url: error.config?.url,
        headers: error.config?.headers,
        baseURL: error.config?.baseURL,
        timeout: error.config?.timeout
      });
    } else {
      console.error(`API Request Error: ${error.message}`);
    }
    
    return Promise.reject(error);
  }
);
