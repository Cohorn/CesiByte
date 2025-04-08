
import React from 'react';
import { Order, OrderStatus } from '@/lib/database.types';
import OrdersList from '@/components/OrdersList';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { isCurrentOrder } from '@/utils/orderUtils';

interface OrderTabsProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, status: OrderStatus) => Promise<{ success: boolean, error?: any }>;
  canUpdateStatus?: boolean;
}

const OrderTabs: React.FC<OrderTabsProps> = ({ 
  orders, 
  onUpdateStatus,
  canUpdateStatus = true
}) => {
  // Split orders by status
  const activeOrders = orders.filter(order => isCurrentOrder(order.status));
  const completedOrders = orders.filter(order => !isCurrentOrder(order.status));
  
  return (
    <Tabs defaultValue="active" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="active">Active Orders ({activeOrders.length})</TabsTrigger>
        <TabsTrigger value="completed">Completed Orders ({completedOrders.length})</TabsTrigger>
      </TabsList>
      
      <TabsContent value="active" className="space-y-4">
        <OrdersList 
          orders={activeOrders} 
          onUpdateStatus={onUpdateStatus}
          isCurrentOrders={true}
          emptyMessage="No active orders found"
          canUpdateStatus={canUpdateStatus}
        />
      </TabsContent>
      
      <TabsContent value="completed" className="space-y-4">
        <OrdersList 
          orders={completedOrders} 
          onUpdateStatus={onUpdateStatus}
          isCurrentOrders={false}
          emptyMessage="No completed orders found"
          canUpdateStatus={false} // Never allow updating completed orders
        />
      </TabsContent>
    </Tabs>
  );
};

export default OrderTabs;
