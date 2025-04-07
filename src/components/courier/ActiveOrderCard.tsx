
import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { calculateDistance, formatDistance } from '@/lib/distanceUtils';
import { OrderStatus } from '@/lib/database.types';

interface ActiveOrderProps {
  id: string;
  restaurantName: string;
  restaurantAddress: string;
  restaurantLat: number;
  restaurantLng: number;
  deliveryAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  status: OrderStatus;
  createdAt: string;
  userLat: number;
  userLng: number;
  onStatusUpdate: (orderId: string, newStatus: OrderStatus) => void;
}

const ActiveOrderCard: React.FC<ActiveOrderProps> = ({
  id,
  restaurantName,
  restaurantAddress,
  restaurantLat,
  restaurantLng,
  deliveryAddress,
  deliveryLat,
  deliveryLng,
  status,
  createdAt,
  userLat,
  userLng,
  onStatusUpdate
}) => {
  // Calculate distances
  const restaurantDistance = calculateDistance(
    userLat, 
    userLng, 
    restaurantLat, 
    restaurantLng
  );
  
  const customerDistance = calculateDistance(
    userLat, 
    userLng, 
    deliveryLat, 
    deliveryLng
  );
  
  return (
    <div className="border p-4 rounded mb-4">
      <h2 className="text-lg font-bold">{restaurantName}</h2>
      <p className="text-gray-600">{restaurantAddress}</p>
      <div className="flex items-center text-sm text-blue-600 mt-1">
        <MapPin className="h-4 w-4 mr-1" />
        <span>{formatDistance(restaurantDistance)} from you</span>
      </div>
      
      <p className="mt-3">
        Delivery to: {deliveryAddress}
      </p>
      <div className="flex items-center text-sm text-blue-600 mt-1">
        <MapPin className="h-4 w-4 mr-1" />
        <span>{formatDistance(customerDistance)} from you</span>
      </div>
      
      <p className="mt-3">
        Status: <span className="font-medium">{status}</span>
      </p>
      <p className="text-sm text-gray-500">
        {formatDistanceToNow(new Date(createdAt), {
          addSuffix: true,
        })}
      </p>

      <div className="mt-4 flex justify-between">
        {status === 'picked_up' && (
          <Button onClick={() => onStatusUpdate(id, 'on_the_way')}>
            Mark as On the Way
          </Button>
        )}
        {status === 'on_the_way' && (
          <Button onClick={() => onStatusUpdate(id, 'delivered')}>
            Mark as Delivered
          </Button>
        )}
      </div>
    </div>
  );
};

export default ActiveOrderCard;
