
import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MapPin, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { calculateDistance, formatDistance } from '@/lib/distanceUtils';
import { OrderStatus } from '@/lib/database.types';
import DeliveryPinInput from './DeliveryPinInput';
import { ActiveOrder } from '@/hooks/useCourierActiveOrders';

interface ActiveOrderProps {
  activeOrder: ActiveOrder;
  onUpdateStatus: (orderId: string, newStatus: OrderStatus) => Promise<boolean>;
  onMarkDelivered: (orderId: string) => void;
}

const ActiveOrderCard: React.FC<ActiveOrderProps> = ({
  activeOrder,
  onUpdateStatus,
  onMarkDelivered
}) => {
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  
  // Calculate distances
  const restaurantDistance = calculateDistance(
    activeOrder.courier_lat || 0, 
    activeOrder.courier_lng || 0, 
    activeOrder.restaurant_lat, 
    activeOrder.restaurant_lng
  );
  
  const customerDistance = calculateDistance(
    activeOrder.courier_lat || 0, 
    activeOrder.courier_lng || 0, 
    activeOrder.delivery_lat, 
    activeOrder.delivery_lng
  );
  
  const handleMarkOnTheWay = async () => {
    // Add async/await to prevent UI flashing from rapid state changes
    await onUpdateStatus(activeOrder.id, 'on_the_way');
    console.log('Order marked as on the way');
  };
  
  const handleCompleteDelivery = () => {
    onMarkDelivered(activeOrder.id);
  };
  
  return (
    <div className="border p-4 rounded mb-4 bg-white shadow">
      <h2 className="text-lg font-bold">{activeOrder.restaurant_name}</h2>
      <p className="text-gray-600">{activeOrder.restaurant_address}</p>
      <div className="flex items-center text-sm text-blue-600 mt-1">
        <MapPin className="h-4 w-4 mr-1" />
        <span>{formatDistance(restaurantDistance)} from you</span>
      </div>
      
      <p className="mt-3">
        Delivery to: {activeOrder.delivery_address}
      </p>
      <div className="flex items-center text-sm text-blue-600 mt-1">
        <MapPin className="h-4 w-4 mr-1" />
        <span>{formatDistance(customerDistance)} from you</span>
      </div>
      
      <p className="mt-3">
        Status: <span className="font-medium capitalize">{activeOrder.status.replace(/_/g, ' ')}</span>
      </p>
      <p className="text-sm text-gray-500">
        {formatDistanceToNow(new Date(activeOrder.created_at), {
          addSuffix: true,
        })}
      </p>

      <div className="mt-4 flex justify-between">
        {activeOrder.status === 'picked_up' && (
          <Button onClick={handleMarkOnTheWay} className="w-full">
            Mark as On the Way
          </Button>
        )}
        {activeOrder.status === 'on_the_way' && (
          <Button onClick={handleCompleteDelivery} className="w-full">
            <KeyRound className="mr-2 h-4 w-4" />
            Enter Delivery PIN
          </Button>
        )}
      </div>
    </div>
  );
};

export default ActiveOrderCard;
