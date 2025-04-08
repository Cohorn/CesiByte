
import React from 'react';
import { Order, Restaurant } from '@/lib/database.types';
import AvailableOrderCard from './AvailableOrderCard';
import { Skeleton } from '@/components/ui/skeleton';

interface OrdersListProps {
  orders: Order[];
  restaurants: { [id: string]: Restaurant };
  userLocation: { lat: number; lng: number };
  onAcceptOrder: (orderId: string) => void;
  isLoading?: boolean;
  canUpdateStatus?: boolean;
}

const OrdersList: React.FC<OrdersListProps> = ({
  orders,
  restaurants,
  userLocation,
  onAcceptOrder,
  isLoading = false,
  canUpdateStatus = false
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 w-full rounded-md" />
        ))}
      </div>
    );
  }
  
  if (orders.length === 0) {
    return (
      <div className="bg-white rounded shadow p-8 text-center">
        <p className="text-gray-500">No available orders at the moment.</p>
        <p className="text-gray-500 mt-2">Check back soon for new delivery opportunities.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <AvailableOrderCard
          key={order.id}
          order={order}
          restaurant={restaurants[order.restaurant_id]}
          userLocation={userLocation}
          onAcceptOrder={onAcceptOrder}
        />
      ))}
    </div>
  );
};

export default OrdersList;
