
import React from 'react';
import { Order, OrderStatus } from '@/lib/database.types';
import OrderListItem from '@/components/OrderListItem';

interface OrdersListProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, status: OrderStatus) => Promise<{ success: boolean, error?: any }>;
  isCurrentOrders?: boolean;
  emptyMessage?: string;
  enableReviews?: boolean;
}

const OrdersList: React.FC<OrdersListProps> = ({ 
  orders, 
  onUpdateStatus,
  isCurrentOrders = true,
  emptyMessage = "No orders found.",
  enableReviews = false
}) => {
  if (orders.length === 0) {
    return (
      <div className="bg-white rounded shadow p-8 text-center">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {orders.map(order => (
        <OrderListItem 
          key={order.id} 
          order={order} 
          onUpdateStatus={onUpdateStatus}
          isCurrentOrder={isCurrentOrders}
          enableReview={enableReviews && order.courier_id !== null && order.status === 'delivered'}
        />
      ))}
    </div>
  );
};

export default OrdersList;
