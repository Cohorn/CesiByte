
import React, { useEffect, useState } from 'react';
import { Order, OrderStatus } from '@/lib/database.types';
import OrderListItem from '@/components/OrderListItem';
import { useIsMobile } from '@/hooks/use-mobile';
import { getEffectiveOrderStatus } from '@/utils/orderTimeUtils';

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
  const isMobile = useIsMobile();
  const [displayOrders, setDisplayOrders] = useState<Order[]>(orders);
  
  // Apply effective status filtering
  useEffect(() => {
    // For "current orders" tab, we should filter out orders that would be auto-canceled
    if (isCurrentOrders) {
      const filtered = orders.filter(order => {
        const effectiveStatus = getEffectiveOrderStatus(order);
        // Current orders shouldn't show effectively canceled orders
        return effectiveStatus !== 'canceled';
      });
      setDisplayOrders(filtered);
    } else {
      // For past orders, we should include auto-canceled orders
      const filtered = orders.filter(order => {
        const effectiveStatus = getEffectiveOrderStatus(order);
        // Past orders should include both completed/delivered and canceled
        return ['delivered', 'completed', 'canceled'].includes(effectiveStatus);
      });
      setDisplayOrders(filtered);
    }
  }, [orders, isCurrentOrders]);
  
  if (displayOrders.length === 0) {
    return (
      <div className="bg-white rounded shadow p-4 md:p-8 text-center">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }
  
  return (
    <div className={`space-y-3 md:space-y-4 ${isMobile ? 'max-w-full' : ''}`}>
      {displayOrders.map(order => (
        <OrderListItem 
          key={order.id} 
          order={order} 
          onUpdateStatus={onUpdateStatus}
          isCurrentOrder={isCurrentOrders}
          enableReview={enableReviews && order.courier_id !== null && getEffectiveOrderStatus(order) === 'delivered'}
        />
      ))}
    </div>
  );
};

export default OrdersList;
