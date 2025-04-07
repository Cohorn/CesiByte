
import React from 'react';
import { format } from 'date-fns';
import { Order, OrderStatus } from '@/lib/database.types';
import OrderItemCard from '@/components/OrderItemCard';
import OrderStatusUpdate from '@/components/OrderStatusUpdate';
import DeliveryReviewButton from '@/components/DeliveryReviewButton';

interface OrderListItemProps {
  order: Order;
  onUpdateStatus: (orderId: string, status: OrderStatus) => Promise<{ success: boolean, error?: any }>;
  isCurrentOrder?: boolean;
  enableReview?: boolean;
}

const OrderListItem: React.FC<OrderListItemProps> = ({ 
  order, 
  onUpdateStatus,
  isCurrentOrder = true,
  enableReview = false
}) => {
  return (
    <div className="bg-white rounded shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Order #{order.id.substring(0, 8)}</h2>
        <span className="text-sm text-gray-600">
          {format(new Date(order.created_at), 'PPP p')}
        </span>
      </div>
      
      <div className="mb-2">
        <strong>Delivery Address:</strong> {order.delivery_address}
      </div>
      
      <div className="mb-2">
        <strong>Status:</strong> <span className="capitalize">{order.status.replace(/_/g, ' ')}</span>
      </div>
      
      <div>
        <strong>Items:</strong>
        <ul className="mt-2">
          {Array.isArray(order.items) && order.items.map((item, index) => (
            <li key={index} className="py-2">
              <OrderItemCard item={item} />
            </li>
          ))}
        </ul>
      </div>
      
      <div className="mt-4">
        <strong>Total:</strong> ${order.total_price?.toFixed(2)}
      </div>
      
      {isCurrentOrder && (
        <OrderStatusUpdate 
          orderId={order.id}
          currentStatus={order.status}
          onStatusUpdate={onUpdateStatus}
        />
      )}
      
      {enableReview && order.courier_id && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <DeliveryReviewButton 
            orderId={order.id} 
            courierId={order.courier_id} 
          />
        </div>
      )}
    </div>
  );
};

export default OrderListItem;
