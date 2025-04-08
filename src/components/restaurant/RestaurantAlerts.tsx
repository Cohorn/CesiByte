
import React from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface RestaurantAlertsProps {
  restaurantError: Error | null;
  ordersError: Error | null;
  restaurantExists: boolean;
}

const RestaurantAlerts: React.FC<RestaurantAlertsProps> = ({
  restaurantError,
  ordersError,
  restaurantExists
}) => {
  if (restaurantError) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Restaurant Error</AlertTitle>
        <AlertDescription>
          {restaurantError instanceof Error 
            ? restaurantError.message 
            : "Could not load restaurant data"}
        </AlertDescription>
      </Alert>
    );
  }
  
  if (ordersError && restaurantExists) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Orders Error</AlertTitle>
        <AlertDescription>
          {ordersError instanceof Error 
            ? ordersError.message 
            : "Could not load orders data"}
        </AlertDescription>
      </Alert>
    );
  }
  
  return null;
};

export default RestaurantAlerts;
