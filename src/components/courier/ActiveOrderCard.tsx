
import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MapPin, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { calculateDistance, formatDistance } from '@/lib/distanceUtils';
import { OrderStatus } from '@/lib/database.types';
import DeliveryPinInput from './DeliveryPinInput';

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
  onVerifyPin: (orderId: string, pin: string) => Promise<{ success: boolean, message?: string }>;
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
  onStatusUpdate,
  onVerifyPin
}) => {
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  
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
  
  const handleMarkOnTheWay = () => {
    onStatusUpdate(id, 'on_the_way');
  };
  
  const handleCompleteDelivery = () => {
    setIsPinDialogOpen(true);
  };
  
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
          <Button onClick={handleMarkOnTheWay}>
            Mark as On the Way
          </Button>
        )}
        {status === 'on_the_way' && (
          <Button onClick={handleCompleteDelivery}>
            <KeyRound className="mr-2 h-4 w-4" />
            Enter Delivery PIN
          </Button>
        )}
      </div>
      
      <DeliveryPinInput
        orderId={id}
        isOpen={isPinDialogOpen}
        onClose={() => setIsPinDialogOpen(false)}
        onVerify={onVerifyPin}
      />
    </div>
  );
};

export default ActiveOrderCard;
