import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Order, OrderStatus } from '@/lib/database.types';
import OrderItemCard from '@/components/OrderItemCard';
import OrderStatusUpdate from '@/components/OrderStatusUpdate';
import DeliveryReviewButton from '@/components/DeliveryReviewButton';
import { getTimeRemainingBeforeCancel, formatRemainingTime, getEffectiveOrderStatus } from '@/utils/orderTimeUtils';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, LockKeyhole } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

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
  const [remainingTime, setRemainingTime] = useState<number | null>(getTimeRemainingBeforeCancel(order));
  const [effectiveStatus, setEffectiveStatus] = useState<OrderStatus>(getEffectiveOrderStatus(order));
  const { user } = useAuth();
  
  useEffect(() => {
    if (remainingTime === null || remainingTime <= 0) return;
    
    const timer = setInterval(() => {
      const newRemainingTime = getTimeRemainingBeforeCancel(order);
      setRemainingTime(newRemainingTime);
      setEffectiveStatus(getEffectiveOrderStatus(order));
    }, 60000);
    
    return () => clearInterval(timer);
  }, [order, remainingTime]);
  
  const getStatusColor = () => {
    if (effectiveStatus === 'canceled') return 'bg-red-100 text-red-800';
    if (effectiveStatus === 'delivered' || effectiveStatus === 'completed') return 'bg-green-100 text-green-800';
    return 'bg-blue-100 text-blue-800';
  };

  const shouldShowPinCode = () => {
    return (
      order.delivery_pin && 
      isCurrentOrder && 
      user?.user_type === 'customer' &&
      user?.id === order.user_id &&
      ['accepted_by_restaurant', 'preparing', 'ready_for_pickup', 'picked_up', 'on_the_way'].includes(order.status)
    );
  };

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
      
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <strong>Status:</strong> 
        <Badge className={getStatusColor()}>
          <span className="capitalize">{effectiveStatus.replace(/_/g, ' ')}</span>
        </Badge>
        
        {remainingTime !== null && effectiveStatus !== 'canceled' && (
          <Badge variant="outline" className="ml-2 flex items-center gap-1">
            {remainingTime <= 15 && <AlertCircle className="h-3 w-3 text-red-500" />}
            {formatRemainingTime(remainingTime)}
          </Badge>
        )}
        
        {effectiveStatus === 'canceled' && order.status !== 'canceled' && (
          <span className="text-xs text-red-600 ml-2">Auto-canceled due to timeout</span>
        )}
      </div>
      
      {shouldShowPinCode() && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded flex items-center">
          <LockKeyhole className="h-5 w-5 text-yellow-600 mr-2" />
          <div>
            <p className="font-medium text-yellow-800">Your Delivery PIN</p>
            <p className="text-xl font-bold tracking-wider">{order.delivery_pin}</p>
            <p className="text-xs text-yellow-700 mt-1">Share this PIN with your courier to confirm delivery</p>
          </div>
        </div>
      )}
      
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
      
      {isCurrentOrder && effectiveStatus !== 'canceled' && (
        <OrderStatusUpdate 
          orderId={order.id}
          currentStatus={order.status}
          onStatusUpdate={onUpdateStatus}
          restaurantId={order.restaurant_id}
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
