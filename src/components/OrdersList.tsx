
import React from 'react';
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
  onReviewCourier?: (orderId: string, courierId: string) => void;
  canUpdateStatus?: boolean;
}

const OrdersList: React.FC<OrdersListProps> = ({ 
  orders, 
  onUpdateStatus,
  isCurrentOrders = true,
  emptyMessage = "No orders found.",
  restaurantNames = {},
  showTabs = false,
  onReviewCourier,
  canUpdateStatus = false
}) => {
  if (orders.length === 0) {
    return (
      <div className="bg-white rounded shadow p-8 text-center">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }
  
  // Split orders into active and past
  const activeOrders = orders.filter(order => isCurrentOrder(order.status));
  const pastOrders = orders.filter(order => !isCurrentOrder(order.status));
  
  // If not showing tabs, render all orders in a single list
  if (!showTabs) {
    return (
      <div className="space-y-4">
        {orders.map(order => (
          <OrderListItem 
            key={order.id} 
            order={order} 
            onUpdateStatus={onUpdateStatus}
            isCurrentOrder={isCurrentOrders}
            restaurantName={restaurantNames[order.restaurant_id]}
            onReviewCourier={onReviewCourier}
            canUpdateStatus={canUpdateStatus}
          />
        ))}
      </div>
    );
  }

  // Show tabbed interface
  return (
    <Tabs defaultValue="active" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="active">Active Orders ({activeOrders.length})</TabsTrigger>
        <TabsTrigger value="past">Past Orders ({pastOrders.length})</TabsTrigger>
      </TabsList>
      
      <TabsContent value="active" className="space-y-4">
        {activeOrders.length === 0 ? (
          <div className="bg-white rounded shadow p-8 text-center">
            <p className="text-gray-500">No active orders found.</p>
          </div>
        ) : (
          activeOrders.map(order => (
            <OrderListItem 
              key={order.id} 
              order={order} 
              onUpdateStatus={onUpdateStatus}
              isCurrentOrder={true}
              restaurantName={restaurantNames[order.restaurant_id]}
              onReviewCourier={onReviewCourier}
              canUpdateStatus={canUpdateStatus}
            />
          ))
        )}
      </TabsContent>
      
      <TabsContent value="past" className="space-y-4">
        {pastOrders.length === 0 ? (
          <div className="bg-white rounded shadow p-8 text-center">
            <p className="text-gray-500">No past orders found.</p>
          </div>
        ) : (
          pastOrders.map(order => (
            <OrderListItem 
              key={order.id} 
              order={order} 
              onUpdateStatus={onUpdateStatus}
              isCurrentOrder={false}
              restaurantName={restaurantNames[order.restaurant_id]}
              onReviewCourier={onReviewCourier}
              canUpdateStatus={canUpdateStatus}
            />
          ))
        )}
      </TabsContent>
    </Tabs>
  );
};

export default OrdersList;
