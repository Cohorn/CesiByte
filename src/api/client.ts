
import axios from 'axios';

// Base URL configuration - prioritize environment variable, but fall back to localhost
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7500';

console.log(`API client using base URL: ${API_BASE_URL}`);

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // Allow absolute URLs when sending requests - important for certain server configurations
  allowAbsoluteUrls: true
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config) => {
    // Check if we have an auth token in local storage - use the correct key name
    const token = localStorage.getItem('auth_token');
    
    if (token) {
      console.log('Using local auth token for request');
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.log('No auth token available for request');
    }
    
    // Log the complete URL being requested for debugging
    const fullUrl = config.baseURL + config.url?.replace(/^\//, '');
    console.log(`API Request: ${config.method?.toUpperCase()} ${fullUrl}`, 
      config.params ? `Params: ${JSON.stringify(config.params)}` : '',
      config.data ? `Data: ${JSON.stringify(config.data)}` : '');
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
apiClient.interceptors.response.use(
  (response) => {
    // Log successful responses for debugging
    console.log(`API Response: ${response.status} from ${response.config.url}`);
    return response;
  },
  (error) => {
    // Handle response errors
    if (error.response) {
      // Server responded with an error status code
      console.error(`API Error ${error.response.status} from ${error.config.url}:`, error.response.data);
      console.error('Request details:', error.config);
      
      // Log the full URL that was requested
      const fullUrl = error.config.baseURL + error.config.url?.replace(/^\//, '');
      console.error(`Full requested URL was: ${fullUrl}`);
    } else if (error.request) {
      // Request was made but no response received
      console.error('API No Response Error:', error.request);
    } else {
      // Something else happened
      console.error('API Request Setup Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
