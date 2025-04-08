
import React, { useState } from 'react';
import { Order, OrderStatus } from '@/lib/database.types';
import OrderListItem from '@/components/OrderListItem';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { isCurrentOrder } from '@/utils/orderUtils';

interface OrdersListProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, status: OrderStatus) => Promise<{ success: boolean, error?: any }>;
  isCurrentOrders?: boolean;
  emptyMessage?: string;
  restaurantNames?: Record<string, string>;
  showTabs?: boolean;
  onReviewCourier?: (orderId: string, courierId: string, data: { rating: number; comment: string }) => void;
  canUpdateStatus?: boolean;
}

const OrdersList: React.FC<OrdersListProps> = ({
  orders,
  onUpdateStatus,
  isCurrentOrders = true,
  emptyMessage = "No orders found",
  restaurantNames,
  showTabs = false,
  onReviewCourier,
  canUpdateStatus = true
}) => {
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>(isCurrentOrders ? 'active' : 'completed');
  
  // If no orders, show the empty message
  if (!orders || orders.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  // For tabbed view, split orders into active and completed
  if (showTabs) {
    const activeOrders = orders.filter(order => isCurrentOrder(order.status));
    const completedOrders = orders.filter(order => !isCurrentOrder(order.status));
    
    return (
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'active' | 'completed')}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="active">Active Orders ({activeOrders.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed Orders ({completedOrders.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-4">
          {activeOrders.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No active orders</div>
          ) : (
            activeOrders.map(order => (
              <OrderListItem
                key={order.id}
                order={order}
                onUpdateStatus={onUpdateStatus}
                isCurrentOrder={true}
                restaurantName={restaurantNames?.[order.restaurant_id]}
                canUpdateStatus={canUpdateStatus}
              />
            ))
          )}
        </TabsContent>
        
        <TabsContent value="completed" className="space-y-4">
          {completedOrders.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No completed orders</div>
          ) : (
            completedOrders.map(order => (
              <OrderListItem
                key={order.id}
                order={order}
                onUpdateStatus={onUpdateStatus}
                isCurrentOrder={false}
                restaurantName={restaurantNames?.[order.restaurant_id]}
                onReviewCourier={onReviewCourier}
                canUpdateStatus={false}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    );
  }
  
  // Non-tabbed view, just show the list
  return (
    <div className="space-y-4">
      {orders.map(order => (
        <OrderListItem
          key={order.id}
          order={order}
          onUpdateStatus={onUpdateStatus}
          isCurrentOrder={isCurrentOrders}
          restaurantName={restaurantNames?.[order.restaurant_id]}
          onReviewCourier={onReviewCourier}
          canUpdateStatus={canUpdateStatus}
        />
      ))}
    </div>
  );
};

export default OrdersList;
