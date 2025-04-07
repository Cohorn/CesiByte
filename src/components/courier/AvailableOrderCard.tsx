
import React from 'react';
import { Order, Restaurant } from '@/lib/database.types';
import { formatDistanceToNow } from 'date-fns';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { calculateDistance, formatDistance } from '@/lib/distanceUtils';

interface AvailableOrderCardProps {
  order: Order;
  restaurant: Restaurant | undefined;
  userLocation: { lat: number; lng: number };
  onAcceptOrder: (orderId: string) => void;
}

const AvailableOrderCard: React.FC<AvailableOrderCardProps> = ({
  order,
  restaurant,
  userLocation,
  onAcceptOrder
}) => {
  // Calculate distances if restaurant data is available
  const restaurantDistance = restaurant 
    ? calculateDistance(userLocation.lat, userLocation.lng, restaurant.lat, restaurant.lng) 
    : 0;
  
  const customerDistance = calculateDistance(
    userLocation.lat, 
    userLocation.lng, 
    order.delivery_lat, 
    order.delivery_lng
  );
  
  return (
    <div className="border p-4 rounded">
      <h2 className="text-lg font-bold">
        {restaurant?.name || 'Unknown Restaurant'}
      </h2>
      <p className="text-gray-600">
        {restaurant?.address || 'Unknown Address'}
      </p>
      
      {restaurant && (
        <div className="flex items-center text-sm text-blue-600 mt-1">
          <MapPin className="h-4 w-4 mr-1" />
          <span>{formatDistance(restaurantDistance)} from you</span>
        </div>
      )}
      
      <p className="mt-3">
        Delivery to: {order.delivery_address}
      </p>
      
      <div className="flex items-center text-sm text-blue-600 mt-1">
        <MapPin className="h-4 w-4 mr-1" />
        <span>{formatDistance(customerDistance)} from you</span>
      </div>
      
      <p className="text-sm text-gray-500 mt-2">
        {formatDistanceToNow(new Date(order.created_at), { 
          addSuffix: true 
        })}
      </p>

      <div className="mt-4">
        <Button onClick={() => onAcceptOrder(order.id)}>
          Accept Order
        </Button>
      </div>
    </div>
  );
};

export default AvailableOrderCard;
