
import React from 'react';
import { Order, Restaurant } from '@/lib/database.types';
import AvailableOrderCard from './AvailableOrderCard';

interface OrdersListProps {
  orders: Order[];
  restaurants: { [id: string]: Restaurant };
  userLocation: { lat: number; lng: number };
  onAcceptOrder: (orderId: string) => void;
}

const OrdersList: React.FC<OrdersListProps> = ({
  orders,
  restaurants,
  userLocation,
  onAcceptOrder
}) => {
  // Safely handle empty orders array
  if (!orders || orders.length === 0) {
    return (
      <div className="bg-white rounded-lg p-4 text-center">
        <p className="text-gray-500">No available orders at the moment</p>
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
