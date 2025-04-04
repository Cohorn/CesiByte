
import React, { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import NavBar from '@/components/NavBar';
import { Button } from '@/components/ui/button';
import { Order, Restaurant, OrderStatus } from '@/lib/database.types';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Star, MapPin } from 'lucide-react';
import { useReviews } from '@/hooks/useReviews';
import { calculateDistance, formatDistance } from '@/lib/distanceUtils';

const CourierAvailableOrders = () => {
  const { user } = useAuth();
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [restaurants, setRestaurants] = useState<{ [id: string]: Restaurant }>({});
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const { toast } = useToast();
  const { averageRating } = useReviews({ courierId: user?.id });

  const fetchAvailableOrders = useCallback(async (force = false) => {
    if (!user) {
      return;
    }

    // Skip fetching if we've already fetched within the last 30 seconds and not forcing refresh
    const now = Date.now();
    if (!force && lastFetched && (now - lastFetched) < 30000) {
      console.log('Skipping available orders fetch - data is fresh');
      return;
    }

    setLoading(true);
    try {
      // Fetch orders without assigned couriers
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .is('courier_id', null)
        .eq('status', 'ready_for_pickup')
        .order('created_at', { ascending: false });
          
      if (error) {
        console.error("Error fetching available orders:", error);
        toast({
          title: "Error",
          description: "Failed to load available orders",
          variant: "destructive",
        });
        return;
      }
      
      if (data) {
        const typedOrders = data.map(order => ({
          ...order,
          status: order.status as OrderStatus
        })) as Order[];
        setAvailableOrders(typedOrders);
      }

      // Fetch restaurants for these orders
      if (data && data.length > 0) {
        const restaurantIds = [...new Set(data.map(order => order.restaurant_id))];
        const { data: restaurantData, error: restaurantError } = await supabase
          .from('restaurants')
          .select('*')
          .in('id', restaurantIds);
            
        if (restaurantError) {
          console.error("Error fetching restaurants:", restaurantError);
        } else if (restaurantData) {
          const restaurantMap = restaurantData.reduce((acc, restaurant) => {
            acc[restaurant.id] = restaurant;
            return acc;
          }, {} as { [id: string]: Restaurant });
          setRestaurants(restaurantMap);
        }
      }
      
      setLastFetched(now);
    } catch (error) {
      console.error("Error fetching available orders:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast, lastFetched]);

  useEffect(() => {
    fetchAvailableOrders();

    // Set up a simplified subscription instead of full realtime
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchAvailableOrders(true);
      }
    }, 60000); // Check every minute when the page is visible

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchAvailableOrders(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchAvailableOrders]);

  const handleAcceptOrder = async (orderId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          courier_id: user.id,
          status: 'picked_up'
        })
        .eq('id', orderId);
      
      if (error) {
        console.error("Error accepting order:", error);
        toast({
          title: "Error",
          description: "Could not accept order",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Order accepted successfully",
        });
        
        // Update local state
        setAvailableOrders(prevOrders => 
          prevOrders.filter(order => order.id !== orderId)
        );
      }
    } catch (error) {
      console.error("Error accepting order:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  // Redirect if user is not a courier
  if (!user || user.user_type !== 'courier') {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Available Orders</h1>
          {averageRating !== null && (
            <div className="flex items-center bg-white p-2 rounded shadow">
              <span className="font-semibold mr-1">Your rating:</span>
              <span className="font-bold mr-1">{averageRating.toFixed(1)}</span>
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            </div>
          )}
        </div>

        <div className="mb-2 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            {lastFetched ? `Last updated: ${formatDistanceToNow(lastFetched, { addSuffix: true })}` : ''}
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fetchAvailableOrders(true)}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>

        {loading ? (
          <p>Loading available orders...</p>
        ) : availableOrders.length > 0 ? (
          <div className="space-y-4">
            {availableOrders.map((order) => {
              const restaurant = restaurants[order.restaurant_id];
              
              // Calculate distances if restaurant data is available
              const restaurantDistance = restaurant ? 
                calculateDistance(user.lat, user.lng, restaurant.lat, restaurant.lng) : 0;
              
              const customerDistance = calculateDistance(
                user.lat, 
                user.lng, 
                order.delivery_lat, 
                order.delivery_lng
              );
              
              return (
                <div key={order.id} className="border p-4 rounded">
                  <h2 className="text-lg font-bold">
                    {restaurant?.name || 'Unknown Restaurant'}
                  </h2>
                  <p className="text-gray-600">
                    {restaurant?.address || 'Unknown Address'}
                  </p>
                  
                  {restaurant && (
                    <div className="flex items-center text-sm text-blue-600 mt-1">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>{formatDistance(restaurantDistance)} from you</span>
                    </div>
                  )}
                  
                  <p className="mt-3">
                    Delivery to: {order.delivery_address}
                  </p>
                  
                  <div className="flex items-center text-sm text-blue-600 mt-1">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>{formatDistance(customerDistance)} from you</span>
                  </div>
                  
                  <p className="text-sm text-gray-500 mt-2">
                    {formatDistanceToNow(new Date(order.created_at), { 
                      addSuffix: true 
                    })}
                  </p>

                  <div className="mt-4">
                    <Button onClick={() => handleAcceptOrder(order.id)}>
                      Accept Order
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p>No available orders</p>
        )}
      </div>
    </div>
  );
};

export default CourierAvailableOrders;
