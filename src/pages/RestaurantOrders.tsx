import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import NavBar from '@/components/NavBar';
import { useOrders } from '@/hooks/useOrders';
import { useRestaurant } from '@/hooks/useRestaurant';
import OrderItemCard from '@/components/OrderItemCard';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import OrderStatusUpdate, { isCurrentOrder } from '@/components/OrderStatusUpdate';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Order, OrderStatus } from '@/lib/database.types';
import { useRestaurantOrdersMQTT } from '@/hooks/useMQTT';

const RestaurantOrders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { restaurant, loading: restaurantLoading, error: restaurantError, fetchRestaurant } = useRestaurant();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [attemptedFetch, setAttemptedFetch] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number | null>(null);
  const { toast } = useToast();
  
  const REFRESH_COOLDOWN = 10000; // 10 seconds
  
  useEffect(() => {
    if (user?.user_type === 'restaurant' && !restaurant && !attemptedFetch) {
      console.log("RestaurantOrders - Fetching restaurant data for user:", user.id);
      setAttemptedFetch(true);
      fetchRestaurant(undefined, true).then(result => {
        console.log("RestaurantOrders - Restaurant fetch result:", result);
      });
    }
  }, [user, restaurant, fetchRestaurant, attemptedFetch]);

  const { 
    orders, 
    isLoading: ordersLoading, 
    error: ordersError, 
    refetch,
    updateOrderStatus 
  } = useOrders(
    restaurant ? { restaurantId: restaurant.id } : {}
  );

  const { newOrder } = restaurant 
    ? useRestaurantOrdersMQTT(restaurant.id) 
    : { newOrder: null };

  useEffect(() => {
    if (newOrder) {
      console.log("Received new order from MQTT:", newOrder);
      refetch(true);
      toast({
        title: "New Order",
        description: `You have received a new order! Order #${newOrder.id}`,
      });
    }
  }, [newOrder, refetch, toast]);

  const [localOrders, setLocalOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (orders.length > 0) {
      console.log("Setting local orders from API orders:", orders);
      setLocalOrders(orders);
    }
  }, [orders]);

  const isLoading = restaurantLoading || ordersLoading;

  const currentOrders = localOrders.filter(order => isCurrentOrder(order.status));
  const pastOrders = localOrders.filter(order => !isCurrentOrder(order.status));

  useEffect(() => {
    console.log("RestaurantOrders - Current restaurant:", restaurant);
    console.log("RestaurantOrders - Current orders:", orders);
    
    if (restaurant && orders.length === 0 && !ordersLoading && !ordersError && !isRefreshing && !attemptedFetch) {
      console.log("RestaurantOrders - Auto-refreshing orders for restaurant:", restaurant.id);
      handleRefresh();
      setAttemptedFetch(true);
    }
  }, [restaurant, orders, ordersLoading, ordersError, isRefreshing, attemptedFetch]);

  const canRefresh = useCallback(() => {
    if (!lastRefreshTime) return true;
    
    const timeSinceLastRefresh = Date.now() - lastRefreshTime;
    return timeSinceLastRefresh >= REFRESH_COOLDOWN;
  }, [lastRefreshTime]);

  const handleRefresh = async () => {
    if (!canRefresh()) {
      const remainingTime = Math.ceil((REFRESH_COOLDOWN - (Date.now() - (lastRefreshTime || 0))) / 1000);
      toast({
        title: "Please wait",
        description: `You can refresh again in ${remainingTime} seconds`,
      });
      return;
    }

    setIsRefreshing(true);
    setLastRefreshTime(Date.now());
    
    try {
      console.log("Manually refreshing restaurant orders");
      if (!restaurant && user) {
        console.log("No restaurant data found, fetching restaurant first");
        const restaurantData = await fetchRestaurant(undefined, true);
        if (restaurantData) {
          console.log("Restaurant fetched, now refreshing orders");
          await refetch?.(true);
          toast({
            title: "Refreshed",
            description: "Restaurant orders have been updated",
          });
        } else {
          console.log("Failed to fetch restaurant");
          toast({
            title: "Error",
            description: "Could not fetch restaurant data",
            variant: "destructive",
          });
        }
      } else if (restaurant) {
        console.log(`Restaurant exists (${restaurant.id}), refreshing orders directly`);
        const refreshedOrders = await refetch?.(true);
        console.log("Orders refreshed:", refreshedOrders);
        toast({
          title: "Refreshed",
          description: "Restaurant orders have been updated",
        });
      } else {
        console.error("User or restaurant missing for refresh operation");
      }
    } catch (error) {
      console.error("Error refreshing orders:", error);
      toast({
        title: "Error",
        description: "Could not refresh orders",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSetupRestaurant = () => {
    navigate('/restaurant/setup');
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const result = await updateOrderStatus(orderId, status);
      
      if (result.success) {
        setLocalOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId 
              ? { ...order, status, updated_at: new Date().toISOString() }
              : order
          )
        );
      }
      
      return result;
    } catch (error) {
      console.error("Error in handleUpdateOrderStatus:", error);
      return { success: false, error };
    }
  };

  const renderOrderCard = (order: Order) => (
    <div key={order.id} className="bg-white rounded shadow p-4">
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
          {order.items?.map((item, index) => (
            <li key={index} className="py-2">
              <OrderItemCard item={item} />
            </li>
          ))}
        </ul>
      </div>
      
      <div className="mt-4">
        <strong>Total:</strong> ${order.total_price?.toFixed(2)}
      </div>
      
      <OrderStatusUpdate 
        orderId={order.id}
        currentStatus={order.status}
        onStatusUpdate={handleUpdateOrderStatus}
      />
    </div>
  );

  if (!user || user.user_type !== 'restaurant') {
    return <div className="flex justify-center items-center h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Unauthorized</h1>
        <p className="text-gray-600">You do not have permission to view this page.</p>
      </div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Restaurant Orders</h1>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            disabled={isRefreshing || !restaurant || !canRefresh()}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        {restaurantError && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Restaurant Error</AlertTitle>
            <AlertDescription>
              {restaurantError instanceof Error 
                ? restaurantError.message 
                : "Could not load restaurant data"}
            </AlertDescription>
          </Alert>
        )}
        
        {ordersError && restaurant && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Orders Error</AlertTitle>
            <AlertDescription>
              {ordersError instanceof Error 
                ? ordersError.message 
                : "Could not load orders data"}
            </AlertDescription>
          </Alert>
        )}
        
        {isLoading ? (
          <div className="text-center py-8 bg-white rounded shadow">
            <p className="text-gray-500">Loading data...</p>
          </div>
        ) : !restaurant ? (
          <div className="bg-white rounded shadow p-8 text-center">
            <h2 className="text-xl font-semibold mb-4">Restaurant Not Found</h2>
            <p className="text-gray-500 mb-4">Please set up your restaurant first.</p>
            <Button onClick={handleSetupRestaurant}>
              Set Up Restaurant
            </Button>
          </div>
        ) : localOrders.length === 0 ? (
          <div className="bg-white rounded shadow p-8 text-center">
            <p className="text-gray-500 mb-4">No orders yet.</p>
            <Button variant="outline" onClick={handleRefresh}>
              Check for new orders
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="current" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="current">
                Current Orders ({currentOrders.length})
              </TabsTrigger>
              <TabsTrigger value="past">
                Past Orders ({pastOrders.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="current" className="space-y-4">
              {currentOrders.length > 0 ? (
                currentOrders.map(renderOrderCard)
              ) : (
                <div className="bg-white rounded shadow p-8 text-center">
                  <p className="text-gray-500">No current orders.</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="past" className="space-y-4">
              {pastOrders.length > 0 ? (
                pastOrders.map(renderOrderCard)
              ) : (
                <div className="bg-white rounded shadow p-8 text-center">
                  <p className="text-gray-500">No past orders.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default RestaurantOrders;
