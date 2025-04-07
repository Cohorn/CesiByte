
import React, { useState, useEffect } from 'react';
import { useOrders } from '@/hooks/useOrders';
import { useAuth } from '@/lib/AuthContext';
import NavBar from '@/components/NavBar';
import { OrderWithRestaurant } from '@/types/order';
import { OrderStatus, Restaurant, OrderItem } from '@/lib/database.types';
import { Card } from '@/components/ui/card';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
  const { orders, isLoading, error, refetch } = useOrders({
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
    if (error && error.message && 
        (error.message.includes('401') || 
         (error.response && error.response.status === 401))) {
      setAuthError(true);
    }
  }, [error]);

  const groupOrdersByStatus = (orders: OrderWithRestaurant[]) => {
    return orders.reduce((acc: { [key in OrderStatus]?: OrderWithRestaurant[] }, order) => {
      if (!acc[order.status]) {
        acc[order.status] = [];
      }
      acc[order.status]?.push(order);
      return acc;
    }, {});
  };

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

  const groupedOrders = groupOrdersByStatus(processedOrders);
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
          Object.entries(groupedOrders).map(([status, orders]) => (
            <div key={status} className="mb-6">
              <h2 className="text-xl font-semibold mb-2">{status.replace(/_/g, ' ')}</h2>
              {!orders || orders.length === 0 ? (
                <p>No orders with this status.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {orders?.map(order => (
                    <div key={order.id} className="bg-white rounded-md shadow-sm p-4">
                      <h3 className="font-semibold">{order.restaurant.name}</h3>
                      <p className="text-gray-500">{order.delivery_address}</p>
                      <p className="text-sm">Total: ${order.total_price.toFixed(2)}</p>
                      <p className="text-sm">Delivery Pin: {order.delivery_pin}</p>
                      <ul className="mt-2">
                        {order.items.map((item, index) => (
                          <li key={`${item.menu_item_id || 'item'}-${index}`} className="text-sm">
                            {item.name} x{item.quantity} - ${(item.price * item.quantity).toFixed(2)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CustomerOrders;
