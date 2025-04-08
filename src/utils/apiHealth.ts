
import { apiClient } from '@/api/client';

interface HealthStatus {
  status: 'ok' | 'error';
  services: {
    [service: string]: 'up' | 'down';
  };
  timestamp: Date;
}

export const checkApiHealth = async (): Promise<HealthStatus> => {
  try {
    const health: HealthStatus = {
      status: 'ok',
      services: {},
      timestamp: new Date()
    };
    
    // Check auth service
    try {
      await apiClient.get('/auth/health');
      health.services.auth = 'up';
    } catch (error) {
      console.error('Auth service health check failed:', error);
      health.services.auth = 'down';
      health.status = 'error';
    }
    
    // Check restaurant service
    try {
      await apiClient.get('/restaurants/health');
      health.services.restaurant = 'up';
    } catch (error) {
      console.error('Restaurant service health check failed:', error);
      health.services.restaurant = 'down';
      health.status = 'error';
    }
    
    // Check order service
    try {
      await apiClient.get('/orders/health');
      health.services.order = 'up';
    } catch (error) {
      console.error('Order service health check failed:', error);
      health.services.order = 'down';
      health.status = 'error';
    }
    
    return health;
  } catch (error) {
    console.error('Health check failed:', error);
    return {
      status: 'error',
      services: {},
      timestamp: new Date()
    };
  }
};
