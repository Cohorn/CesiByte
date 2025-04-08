
import React from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, InfoIcon } from 'lucide-react';

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
  if (!restaurantError && !ordersError) return null;
  
  return (
    <div className="space-y-4 mb-4">
      {restaurantError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertTitle>Restaurant Error</AlertTitle>
          <AlertDescription>
            {restaurantError.message || 'There was an error loading your restaurant data'}
          </AlertDescription>
        </Alert>
      )}
      
      {ordersError && restaurantExists && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertTitle>Orders Error</AlertTitle>
          <AlertDescription>
            {ordersError.message || 'There was an error loading your orders'}
          </AlertDescription>
        </Alert>
      )}
      
      {restaurantExists && (
        <Alert>
          <InfoIcon className="h-4 w-4 mr-2" />
          <AlertTitle>Need Help?</AlertTitle>
          <AlertDescription>
            If you're having trouble viewing your restaurant information, try refreshing the page or checking your internet connection.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default RestaurantAlerts;
