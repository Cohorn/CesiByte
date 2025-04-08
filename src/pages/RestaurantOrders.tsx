
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
  const { toast } = useToast();
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  // No longer using REFRESH_COOLDOWN
  const STALE_CHECK_INTERVAL = 5 * 60 * 1000; // Check for stale orders every 5 minutes

  // Initialize orders state regardless of restaurant
  const { 
    orders, 
    isLoading: ordersLoading, 
    error: ordersError, 
    refetch,
    updateOrderStatus 
  } = useOrders(
    restaurant ? { restaurantId: restaurant.id } : {} 
  );

  // Initialize MQTT state regardless of restaurant
  const { newOrder } = useRestaurantOrdersMQTT(restaurant?.id);

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
          // Auto refresh orders on initial page load
          refetch(true).then(() => {
            setInitialLoadComplete(true);
          });
        }
      });
    }
  }, [user, restaurant, fetchRestaurant, refetch]);

  // If restaurant is already loaded on component mount, fetch orders automatically
  useEffect(() => {
    if (restaurant && !initialLoadComplete) {
      console.log("Restaurant data already loaded, auto-refreshing orders");
      refetch(true).then(() => {
        setInitialLoadComplete(true);
      });
    }
  }, [restaurant, initialLoadComplete, refetch]);

  // Periodically check for stale orders
  useEffect(() => {
    if (!restaurant) return;
    
    const checkStaleOrdersInterval = setInterval(() => {
      console.log("Checking for stale orders...");
      refetch(true);
    }, STALE_CHECK_INTERVAL);
    
    return () => clearInterval(checkStaleOrdersInterval);
  }, [restaurant, refetch]);

  const handleRefresh = async () => {
    // Now restaurants can refresh at any time
    setIsRefreshing(true);
    
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

  // If user is not logged in or not a restaurant owner, show unauthorized message
  if (!user || user.user_type !== 'restaurant') {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Unauthorized</h1>
          <p className="text-gray-600">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="container mx-auto py-8">
        <RestaurantHeader 
          title="Restaurant Orders" 
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          canRefresh={!!restaurant} // Always allow refreshing now
        />
        
        <RestaurantAlerts 
          restaurantError={restaurantError} 
          ordersError={ordersError}
          restaurantExists={!!restaurant}
        />
        
        {isLoading ? (
          <LoadingState message="Loading restaurant orders..." />
        ) : !restaurant ? (
          <RestaurantSetupPrompt />
        ) : orders.length === 0 ? (
          <NoOrdersPrompt onRefresh={handleRefresh} />
        ) : (
          <OrderTabs 
            orders={orders} 
            onUpdateStatus={handleUpdateOrderStatus}
            canUpdateStatus={true}
          />
        )}
      </div>
    </div>
  );
};

export default RestaurantOrders;
