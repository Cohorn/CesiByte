
import React, { useState, useEffect } from 'react';
import { useOrders } from '@/hooks/useOrders';
import { useAuth } from '@/lib/AuthContext';
import NavBar from '@/components/NavBar';
import { OrderWithRestaurant } from '@/types/order';
import { OrderStatus, Restaurant, Order } from '@/lib/database.types';
import { Card } from '@/components/ui/card';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import OrdersList from '@/components/OrdersList';
import { useReviews } from '@/hooks/useReviews';
import { useToast } from '@/hooks/use-toast';
import { restaurantApi } from '@/api/services/restaurantService';

const processOrdersWithRestaurants = (data: any[]): OrderWithRestaurant[] => {
  return data.map(order => {
    const delivery_pin = order.delivery_pin || '0000';
    
    let restaurant: Restaurant;
    if (order.restaurant) {
      restaurant = order.restaurant;
    } else {
      restaurant = {
        id: order.restaurant_id || '',
        name: 'Unknown Restaurant',
        address: 'Unknown Address',
        lat: 0,
        lng: 0,
        user_id: '',
        created_at: order.created_at || new Date().toISOString(),
        image_url: null
      };
    }
    
    return {
      id: order.id,
      user_id: order.user_id,
      restaurant_id: order.restaurant_id,
      courier_id: order.courier_id,
      status: order.status as OrderStatus,
      items: order.items,
      total_price: order.total_price,
      delivery_address: order.delivery_address,
      delivery_lat: order.delivery_lat,
      delivery_lng: order.delivery_lng,
      created_at: order.created_at,
      updated_at: order.updated_at,
      delivery_pin: delivery_pin,
      restaurant: restaurant
    };
  });
};

const CustomerOrders: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { orders, isLoading, error, refetch } = useOrders({
    userId: user?.id
  });
  const [processedOrders, setProcessedOrders] = useState<OrderWithRestaurant[]>([]);
  const [previousOrderStatuses, setPreviousOrderStatuses] = useState<Record<string, OrderStatus>>({});
  const [authError, setAuthError] = useState<boolean>(false);
  const { submitReview } = useReviews();
  const { toast } = useToast();
  const [restaurantNames, setRestaurantNames] = useState<Record<string, string>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number | null>(null);
  
  const REFRESH_COOLDOWN = 10000; // 10 seconds cooldown

  useEffect(() => {
    const fetchRestaurantNames = async () => {
      if (!orders || orders.length === 0) return;
      
      const restaurantIds = Array.from(new Set(
        orders.map(order => order.restaurant_id)
      ));
      
      const namesMap: Record<string, string> = {};
      
      for (const id of restaurantIds) {
        try {
          const restaurant = await restaurantApi.supabase.getRestaurant(id);
          if (restaurant) {
            namesMap[id] = restaurant.name;
          } else {
            namesMap[id] = "Unknown Restaurant";
          }
        } catch (error) {
          console.error(`Error fetching restaurant ${id}:`, error);
          namesMap[id] = "Unknown Restaurant";
        }
      }
      
      setRestaurantNames(namesMap);
    };
    
    if (orders && orders.length > 0) {
      fetchRestaurantNames();
    }
  }, [orders]);

  // Track order status changes
  useEffect(() => {
    if (orders && orders.length > 0) {
      // First time we get orders, set up initial status state
      if (Object.keys(previousOrderStatuses).length === 0) {
        console.log("Initial order statuses setup");
        const initialStatuses: Record<string, OrderStatus> = {};
        orders.forEach((order: Order) => {
          initialStatuses[order.id] = order.status as OrderStatus;
        });
        setPreviousOrderStatuses(initialStatuses);
      } else {
        // On subsequent updates, we compare with existing statuses
        const updatedOrders = orders.filter((order: Order) => 
          previousOrderStatuses[order.id] && 
          previousOrderStatuses[order.id] !== order.status
        );
        
        // If we have status changes, update previous statuses
        if (updatedOrders.length > 0) {
          console.log("Status changes detected:", updatedOrders.length);
          const newStatusMap: Record<string, OrderStatus> = {...previousOrderStatuses};
          
          orders.forEach((order: Order) => {
            newStatusMap[order.id] = order.status as OrderStatus;
          });
          
          setPreviousOrderStatuses(newStatusMap);
        }
      }
    }
  }, [orders]);

  useEffect(() => {
    if (orders) {
      const ordersWithRestaurants = processOrdersWithRestaurants(orders);
      setProcessedOrders(ordersWithRestaurants);
    } else {
      setProcessedOrders([]);
    }
  }, [orders]);

  useEffect(() => {
    if (user && user.id) {
      refetch();
    }
  }, [refetch, user]);

  useEffect(() => {
    if (error) {
      const axiosError = error as Error & { response?: { status?: number } };
      if (axiosError.response && axiosError.response.status === 401) {
        setAuthError(true);
      }
    }
  }, [error]);

  const canRefresh = () => {
    if (!lastRefreshTime) return true;
    
    const timeSinceLastRefresh = Date.now() - lastRefreshTime;
    return timeSinceLastRefresh >= REFRESH_COOLDOWN;
  };
  
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
      await refetch(true);
      toast({
        title: "Refreshed",
        description: "Your orders have been updated",
      });
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

  const handleReviewCourier = async (orderId: string, courierId: string, data: { rating: number; comment: string }) => {
    if (!user) return;
    
    try {
      const result = await submitReview({
        user_id: user.id,
        courier_id: courierId,
        rating: data.rating,
        comment: data.comment || ''
      });
      
      if (result.success) {
        toast({
          title: "Review Submitted",
          description: "Thank you for reviewing your courier",
        });
      } else {
        throw new Error(result.error || "Unknown error");
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      toast({
        title: "Error",
        description: "Failed to submit review",
        variant: "destructive"
      });
    }
  };

  if ((!authLoading && !user) || authError) {
    return <Navigate to="/login" />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="container mx-auto py-8">
          <h1 className="text-2xl font-bold mb-4">Your Orders</h1>
          <Card className="p-8 text-center bg-white">
            <p className="text-gray-500">Loading orders...</p>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="container mx-auto py-8">
          <h1 className="text-2xl font-bold mb-4">Your Orders</h1>
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error.message}
              <div className="mt-2">
                <Button 
                  onClick={() => refetch()} 
                  variant="outline"
                  className="mt-2"
                >
                  Try Again
                </Button>
              </div>
            </AlertDescription>
          </Alert>
          <Card className="p-8 text-center bg-white">
            <p className="text-red-500">Failed to load your orders</p>
            <Button 
              onClick={() => refetch()} 
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Try Again
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const hasOrders = processedOrders.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Your Orders</h1>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            disabled={isRefreshing || !canRefresh()}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        {!hasOrders ? (
          <Card className="p-8 text-center bg-white">
            <p className="text-gray-500 mb-2">You don't have any orders yet.</p>
            <p className="text-gray-500">Start ordering from your favorite restaurants!</p>
          </Card>
        ) : (
          <Card className="p-6">
            <OrdersList 
              orders={processedOrders}
              onUpdateStatus={() => Promise.resolve({ success: false })}
              isCurrentOrders={false}
              restaurantNames={restaurantNames}
              showTabs={true}
              onReviewCourier={handleReviewCourier}
              canUpdateStatus={false}
              previousOrderStatuses={previousOrderStatuses}
              emptyMessage="No orders found"
            />
          </Card>
        )}
      </div>
    </div>
  );
};

export default CustomerOrders;
