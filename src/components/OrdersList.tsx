
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Order, OrderStatus } from '@/lib/database.types';
import OrderListItem from './OrderListItem';
import { isCurrentOrder, processStaleOrders } from '@/utils/orderUtils';

interface OrdersListProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, status: OrderStatus) => Promise<{ success: boolean, error?: any }>;
  isCurrentOrders?: boolean;
  restaurantNames?: Record<string, string>;
  showTabs?: boolean;
  onReviewCourier?: (orderId: string, courierId: string, data: { rating: number; comment: string }) => void;
  canUpdateStatus?: boolean;
  previousOrderStatuses?: Record<string, OrderStatus>;
}

const OrdersList: React.FC<OrdersListProps> = ({ 
  orders, 
  onUpdateStatus, 
  isCurrentOrders = true,
  restaurantNames = {},
  showTabs = false,
  onReviewCourier,
  canUpdateStatus = false,
  previousOrderStatuses = {}
}) => {
  const [activeTab, setActiveTab] = useState("active");
  
  // Process orders to handle stale ones
  const processedOrders = processStaleOrders(orders);
  
  // Filter orders based on active tab
  const currentOrders = processedOrders.filter(order => 
    isCurrentOrder(order.status)
  );
  
  const pastOrders = processedOrders.filter(order => 
    !isCurrentOrder(order.status)
  );
  
  // If there are no tabs, just render all orders
  if (!showTabs) {
    return (
      <div className="space-y-4">
        {processedOrders.length === 0 ? (
          <p className="text-center text-gray-500 my-8">No orders found</p>
        ) : (
          processedOrders.map(order => (
            <OrderListItem 
              key={order.id} 
              order={order} 
              onUpdateStatus={onUpdateStatus}
              isCurrentOrder={isCurrentOrders}
              restaurantName={restaurantNames[order.restaurant_id]}
              onReviewCourier={onReviewCourier}
              canUpdateStatus={canUpdateStatus}
              previousStatus={previousOrderStatuses[order.id]}
            />
          ))
        )}
      </div>
    );
  }
  
  // With tabs, render active and past orders separately
  return (
    <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="active" className="text-center">
          Active Orders
          {currentOrders.length > 0 && (
            <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">
              {currentOrders.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="completed" className="text-center">
          Completed Orders
          {pastOrders.length > 0 && (
            <span className="ml-2 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
              {pastOrders.length}
            </span>
          )}
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="active" className="mt-0">
        <div className="space-y-4">
          {currentOrders.length === 0 ? (
            <p className="text-center text-gray-500 my-8">No active orders</p>
          ) : (
            currentOrders.map(order => (
              <OrderListItem 
                key={order.id} 
                order={order} 
                onUpdateStatus={onUpdateStatus}
                isCurrentOrder={true}
                restaurantName={restaurantNames[order.restaurant_id]}
                onReviewCourier={onReviewCourier}
                canUpdateStatus={canUpdateStatus}
                previousStatus={previousOrderStatuses[order.id]}
              />
            ))
          )}
        </div>
      </TabsContent>
      
      <TabsContent value="completed" className="mt-0">
        <div className="space-y-4">
          {pastOrders.length === 0 ? (
            <p className="text-center text-gray-500 my-8">No completed orders</p>
          ) : (
            pastOrders.map(order => (
              <OrderListItem 
                key={order.id} 
                order={order} 
                onUpdateStatus={onUpdateStatus}
                isCurrentOrder={false}
                restaurantName={restaurantNames[order.restaurant_id]}
                onReviewCourier={onReviewCourier}
                canUpdateStatus={false}
                previousStatus={previousOrderStatuses[order.id]}
              />
            ))
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default OrdersList;
