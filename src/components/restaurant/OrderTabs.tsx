
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Order, OrderStatus } from '@/lib/database.types';
import OrdersList from '@/components/OrdersList';
import { isCurrentOrder } from '@/utils/orderUtils';

interface OrderTabsProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, status: OrderStatus) => Promise<{ success: boolean, error?: any }>;
}

const OrderTabs: React.FC<OrderTabsProps> = ({ orders, onUpdateStatus }) => {
  // Filter orders into current and past
  const currentOrders = orders.filter(order => isCurrentOrder(order.status));
  const pastOrders = orders.filter(order => !isCurrentOrder(order.status));
  
  return (
    <Tabs defaultValue="current" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="current">
          Current Orders ({currentOrders.length})
        </TabsTrigger>
        <TabsTrigger value="past">
          Past Orders ({pastOrders.length})
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="current">
        <OrdersList 
          orders={currentOrders} 
          onUpdateStatus={onUpdateStatus}
          isCurrentOrders={true}
          emptyMessage="No current orders."
        />
      </TabsContent>
      
      <TabsContent value="past">
        <OrdersList 
          orders={pastOrders} 
          onUpdateStatus={onUpdateStatus}
          isCurrentOrders={false}
          emptyMessage="No past orders."
        />
      </TabsContent>
    </Tabs>
  );
};

export default OrderTabs;
