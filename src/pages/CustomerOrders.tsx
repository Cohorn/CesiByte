import React, { useState, useEffect } from 'react';
import { useOrders } from '@/hooks/useOrders';
import { useAuth } from '@/lib/AuthContext';
import NavBar from '@/components/NavBar';
import { OrderWithRestaurant } from '@/types/order';
import { OrderStatus, Restaurant } from '@/lib/database.types';
import { Card } from '@/components/ui/card';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import OrdersList from '@/components/OrdersList';
import { useReviews } from '@/hooks/useReviews';
import { useToast } from '@/hooks/use-toast';

const processOrdersWithRestaurants = (data: any[]): OrderWithRestaurant[] => {
  return data.map(order => {
    const delivery_pin = order.delivery_pin || '0000';
    
    const restaurant = order.restaurants || {};
    
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
      restaurant: {
        id: restaurant.id || '',
        name: restaurant.name || 'Unknown Restaurant',
        address: restaurant.address || 'Unknown Address',
        lat: restaurant.lat || 0,
        lng: restaurant.lng || 0,
        user_id: restaurant.user_id || '',
        created_at: restaurant.created_at || order.created_at,
        image_url: restaurant.image_url || null
      } as Restaurant
    };
  });
};

const CustomerOrders: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { orders, isLoading, error, refetch } = useOrders({
    userId: user?.id
  });
  const [processedOrders, setProcessedOrders] = useState<OrderWithRestaurant[]>([]);
  const [authError, setAuthError] = useState<boolean>(false);
  const { submitReview } = useReviews();
  const { toast } = useToast();

  useEffect(() => {
    if (orders) {
      const ordersWithRestaurants = processOrdersWithRestaurants(orders);
      setProcessedOrders(ordersWithRestaurants);
      
      console.log("Processed orders with restaurant data:", ordersWithRestaurants);
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

  const restaurantNames = processedOrders.reduce((acc, order) => {
    if (order.restaurant && order.restaurant.name) {
      acc[order.restaurant_id] = order.restaurant.name;
    } else {
      const originalOrder = orders?.find(o => o.id === order.id);
      if (originalOrder?.restaurants?.name) {
        acc[order.restaurant_id] = originalOrder.restaurants.name;
      } else {
        console.log(`Missing restaurant name for order ${order.id}, restaurant_id: ${order.restaurant_id}`);
      }
    }
    return acc;
  }, {} as Record<string, string>);

  console.log("Restaurant names mapping:", restaurantNames);

  const handleReviewCourier = async (orderId: string, courierId: string) => {
    if (!user) return;
    
    try {
      const result = await submitReview({
        user_id: user.id,
        courier_id: courierId,
        rating: 5,
        comment: ''
      });
      
      if (result.success) {
        toast({
          title: "Review Submitted",
          description: "Thank you for reviewing your courier",
        });
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
        <h1 className="text-2xl font-bold mb-4">Your Orders</h1>
        
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
            />
          </Card>
        )}
      </div>
    </div>
  );
};

export default CustomerOrders;
