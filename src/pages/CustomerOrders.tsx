
import React, { useState, useEffect } from 'react';
import { useOrders } from '@/hooks/useOrders';
import { useAuth } from '@/lib/AuthContext';
import NavBar from '@/components/NavBar';
import { OrderWithRestaurant } from '@/types/order';
import { OrderStatus, Restaurant, OrderItem } from '@/lib/database.types';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import OrdersList from '@/components/OrdersList';
import { isCurrentOrder } from '@/utils/orderUtils';

// Define the function first before using it in useEffect
const processOrdersWithRestaurants = (data: any[]): OrderWithRestaurant[] => {
  return data.map(order => {
    // Add delivery_pin with default value if it doesn't exist in the order record
    const delivery_pin = order.delivery_pin || '0000';
    
    return {
      id: order.id,
      user_id: order.user_id,
      restaurant_id: order.restaurant_id,
      courier_id: order.courier_id,
      status: order.status as OrderStatus,
      items: order.items as OrderItem[],
      total_price: order.total_price,
      delivery_address: order.delivery_address,
      delivery_lat: order.delivery_lat,
      delivery_lng: order.delivery_lng,
      created_at: order.created_at,
      updated_at: order.updated_at,
      delivery_pin: delivery_pin,
      restaurant: {
        id: order.restaurants?.id || '',
        name: order.restaurants?.name || 'Unknown Restaurant',
        address: order.restaurants?.address || 'Unknown Address',
        lat: order.restaurants?.lat || 0,
        lng: order.restaurants?.lng || 0,
        user_id: order.restaurants?.user_id || '',
        created_at: order.restaurants?.created_at || order.created_at,
        image_url: order.restaurants?.image_url || null
      } as Restaurant
    };
  });
};

const CustomerOrders: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { orders, isLoading, error, refetch, updateOrderStatus } = useOrders({
    userId: user?.id
  });
  const [processedOrders, setProcessedOrders] = useState<OrderWithRestaurant[]>([]);
  const [authError, setAuthError] = useState<boolean>(false);

  useEffect(() => {
    if (orders) {
      const ordersWithRestaurants = processOrdersWithRestaurants(orders);
      setProcessedOrders(ordersWithRestaurants);
    } else {
      // Reset to empty array when there are no orders
      setProcessedOrders([]);
    }
  }, [orders]);

  useEffect(() => {
    // Only fetch orders if user is authenticated
    if (user && user.id) {
      refetch();
    }
  }, [refetch, user]);

  // Check for authentication errors (401)
  useEffect(() => {
    if (error) {
      // Use type assertion to check for response property on Error
      const axiosError = error as Error & { response?: { status?: number } };
      if (axiosError.response && axiosError.response.status === 401) {
        setAuthError(true);
      }
    }
  }, [error]);

  // Redirect to login if not authenticated or auth error
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
        </div>
      </div>
    );
  }

  // Separate current and past orders
  const currentOrders = processedOrders.filter(order => isCurrentOrder(order.status));
  const pastOrders = processedOrders.filter(order => !isCurrentOrder(order.status));

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
                onUpdateStatus={updateOrderStatus}
                isCurrentOrders={true}
                emptyMessage="You have no ongoing orders."
              />
            </TabsContent>
            
            <TabsContent value="past">
              <OrdersList 
                orders={pastOrders} 
                onUpdateStatus={updateOrderStatus}
                isCurrentOrders={false}
                emptyMessage="You have no completed orders yet."
                enableReviews={true}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default CustomerOrders;
