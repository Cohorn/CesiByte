
import { apiClient } from '@/api/client';

export const checkApiEndpoints = async () => {
  const endpoints = [
    { name: 'Health Check', path: '/health' },
    { name: 'Restaurants', path: '/restaurants' },
    { name: 'Restaurant by User', path: '/restaurants/user/{userId}', dynamic: true },
    { name: 'Restaurant Menu', path: '/restaurants/{restaurantId}/menu', dynamic: true },
    { name: 'Orders', path: '/orders' },
    { name: 'Orders by Restaurant', path: '/orders/restaurant/{restaurantId}', dynamic: true }
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    if (!endpoint.dynamic) {
      try {
        console.log(`Checking endpoint: ${endpoint.path}`);
        const response = await apiClient.get(endpoint.path);
        results.push({
          name: endpoint.name,
          path: endpoint.path,
          status: response.status,
          working: true
        });
      } catch (error: any) {
        console.error(`Error checking endpoint ${endpoint.path}:`, error);
        results.push({
          name: endpoint.name,
          path: endpoint.path,
          status: error.response?.status || 'unknown',
          working: false,
          error: error.message
        });
      }
    } else {
      console.log(`Skipping dynamic endpoint check for: ${endpoint.path}`);
    }
  }
  
  return results;
};

export const checkRestaurantEndpoint = async (userId: string) => {
  try {
    console.log(`Checking restaurant endpoint for user: ${userId}`);
    const response = await apiClient.get(`/restaurants/user/${userId}`);
    return {
      working: true,
      status: response.status,
      data: response.data
    };
  } catch (error: any) {
    console.error(`Error checking restaurant endpoint for user ${userId}:`, error);
    return {
      working: false,
      status: error.response?.status || 'unknown',
      error: error.message
    };
  }
};
