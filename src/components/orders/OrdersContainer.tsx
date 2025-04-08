
import React, { useState } from 'react';
import { useOrders } from '@/hooks/useOrders';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import OrderListItem from '@/components/OrderListItem';
import { Order, OrderStatus } from '@/lib/database.types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

const OrdersContainer = () => {
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  
  const { 
    orders, 
    isLoading, 
    error, 
    refetch,
    updateOrderStatus
  } = user ? useOrders({ userId: user.id }) : { orders: [], isLoading: false, error: null, refetch: null, updateOrderStatus: null };

  const activeOrders = orders.filter(order => 
    !['delivered', 'completed'].includes(order.status)
  );
  
  const pastOrders = orders.filter(order => 
    ['delivered', 'completed'].includes(order.status)
  );

  const handleRefresh = async () => {
    if (!refetch) return;
    
    setIsRefreshing(true);
    
    try {
      await refetch(true);
      toast({
        title: "Orders refreshed",
        description: "Your order list has been updated",
      });
    } catch (error) {
      console.error("Error refreshing orders:", error);
      toast({
        title: "Refresh failed",
        description: "Could not refresh your orders",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    if (!updateOrderStatus) return;
    
    try {
      await updateOrderStatus(orderId, status);
      toast({
        title: "Order updated",
        description: `Order status changed to ${status}`,
      });
      
      if (refetch) {
        await refetch(true);
      }
      
      return { success: true };
    } catch (error) {
      console.error("Error updating order status:", error);
      toast({
        title: "Update failed",
        description: "Could not update order status",
        variant: "destructive",
      });
      
      return { success: false, error };
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-32" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
        <h3 className="font-semibold">Error loading orders</h3>
        <p className="text-sm">{error.message}</p>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-2"
          onClick={handleRefresh}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-md">
        <h3 className="font-semibold text-xl mb-2">No orders yet</h3>
        <p className="text-gray-500 mb-4">When you place an order, it will appear here.</p>
        <Button onClick={() => window.location.href = "/"}>
          Browse Restaurants
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Your Orders</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">
            Active Orders ({activeOrders.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past Orders ({pastOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 mt-4">
          {activeOrders.length === 0 ? (
            <div className="text-center p-4 bg-gray-50 rounded-md">
              <p className="text-gray-500">You have no active orders</p>
            </div>
          ) : (
            activeOrders.map((order: Order) => (
              <OrderListItem 
                key={order.id} 
                order={order} 
                onUpdateStatus={handleUpdateStatus}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4 mt-4">
          {pastOrders.length === 0 ? (
            <div className="text-center p-4 bg-gray-50 rounded-md">
              <p className="text-gray-500">You have no past orders</p>
            </div>
          ) : (
            pastOrders.map((order: Order) => (
              <OrderListItem 
                key={order.id} 
                order={order}
                onUpdateStatus={handleUpdateStatus}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OrdersContainer;
