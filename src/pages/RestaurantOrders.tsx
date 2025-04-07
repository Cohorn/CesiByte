
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import NavBar from '@/components/NavBar';
import { useOrders } from '@/hooks/useOrders';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Order, OrderStatus } from '@/lib/database.types';
import { useRestaurantOrdersMQTT } from '@/hooks/useMQTT';

// Import refactored components
import RestaurantHeader from '@/components/restaurant/RestaurantHeader';
import RestaurantAlerts from '@/components/restaurant/RestaurantAlerts';
import RestaurantSetupPrompt from '@/components/restaurant/RestaurantSetupPrompt';
import NoOrdersPrompt from '@/components/restaurant/NoOrdersPrompt';
import LoadingState from '@/components/restaurant/LoadingState';
import OrderTabs from '@/components/restaurant/OrderTabs';

const RestaurantOrders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { restaurant, loading: restaurantLoading, error: restaurantError, fetchRestaurant } = useRestaurant();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number | null>(null);
  const { toast } = useToast();
  
  const REFRESH_COOLDOWN = 10000; // 10 seconds

  // Only fetch orders once we have the restaurant
  const { 
    orders, 
    isLoading: ordersLoading, 
    error: ordersError, 
    refetch,
    updateOrderStatus 
  } = useOrders(
    restaurant ? { restaurantId: restaurant.id } : {}
  );

  // Set up MQTT for real-time order notifications
  const { newOrder } = restaurant 
    ? useRestaurantOrdersMQTT(restaurant.id) 
    : { newOrder: null };

  // Handle new orders from MQTT
  useEffect(() => {
    if (newOrder) {
      console.log("Received new order from MQTT:", newOrder);
      refetch(true);
      toast({
        title: "New Order",
        description: `You have received a new order! Order #${newOrder.id?.substring(0, 8) || 'New'}`,
      });
    }
  }, [newOrder, refetch, toast]);

  const isLoading = restaurantLoading || ordersLoading;

  // Fetch restaurant data if user is logged in and is a restaurant owner
  useEffect(() => {
    if (user?.user_type === 'restaurant' && !restaurant) {
      console.log("RestaurantOrders - Fetching restaurant data for user:", user.id);
      fetchRestaurant(user.id, true).then(result => {
        console.log("RestaurantOrders - Restaurant fetch result:", result);
        
        // If we successfully fetched the restaurant, refresh orders
        if (result) {
          refetch(true);
        }
      });
    }
  }, [user, restaurant, fetchRestaurant, refetch]);

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
        const restaurantData = await fetchRestaurant(user.id, true);
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

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const result = await updateOrderStatus(orderId, status);
      return result;
    } catch (error) {
      console.error("Error in handleUpdateOrderStatus:", error);
      return { success: false, error };
    }
  };

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
        <RestaurantHeader 
          title="Restaurant Orders" 
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          canRefresh={!!restaurant && canRefresh()}
        />
        
        <RestaurantAlerts 
          restaurantError={restaurantError} 
          ordersError={ordersError}
          restaurantExists={!!restaurant}
        />
        
        {isLoading ? (
          <LoadingState />
        ) : !restaurant ? (
          <RestaurantSetupPrompt />
        ) : orders.length === 0 ? (
          <NoOrdersPrompt onRefresh={handleRefresh} />
        ) : (
          <OrderTabs 
            orders={orders} 
            onUpdateStatus={handleUpdateOrderStatus}
          />
        )}
      </div>
    </div>
  );
};

export default RestaurantOrders;
