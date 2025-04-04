
import React, { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import NavBar from '@/components/NavBar';
import { Button } from '@/components/ui/button';
import Map from '@/components/Map';
import { Order, OrderStatus, Restaurant, MapLocationType, SimpleUser } from '@/lib/database.types';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useReviews } from '@/hooks/useReviews';
import ReviewStats from '@/components/ReviewStats';
import ReviewList from '@/components/ReviewList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { calculateDistance, formatDistance } from '@/lib/distanceUtils';
import { MapPin } from 'lucide-react';

interface ActiveOrder extends Order {
  restaurant_name: string;
  restaurant_address: string;
  restaurant_lat: number;
  restaurant_lng: number;
}

interface RestaurantData {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

const CourierActiveOrders = () => {
  const { user } = useAuth();
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const { toast } = useToast();
  const { reviews, refetch: refetchReviews } = useReviews({ courierId: user?.id });
  const [reviewers, setReviewers] = useState<SimpleUser[]>([]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const fetchActiveOrders = async () => {
      try {
        // Fetch orders assigned to the current courier with restaurant details
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select(`
            *,
            restaurants (
              name,
              address,
              lat,
              lng
            )
          `)
          .eq('courier_id', user.id)
          .in('status', ['picked_up', 'on_the_way']);

        if (ordersError) {
          console.error("Error fetching active orders:", ordersError);
          toast({
            title: "Error",
            description: "Failed to load active orders",
            variant: "destructive",
          });
          return;
        }

        if (ordersData) {
          const formattedOrders = ordersData.map(order => {
            const restaurantData = order.restaurants as unknown as RestaurantData;
            
            // Parse items if needed
            const parsedItems = typeof order.items === 'string' 
              ? JSON.parse(order.items as string) 
              : (Array.isArray(order.items) ? order.items : []);
              
            return {
              ...order,
              items: parsedItems,
              restaurant_name: restaurantData?.name || 'Unknown Restaurant',
              restaurant_address: restaurantData?.address || 'Unknown Address',
              restaurant_lat: restaurantData?.lat || 0,
              restaurant_lng: restaurantData?.lng || 0,
            } as ActiveOrder;
          });
          setActiveOrders(formattedOrders);
        }

        // Fetch reviewers
        if (reviews.length > 0) {
          const reviewerIds = reviews.map(review => review.user_id);
          const { data: reviewersData } = await supabase
            .from('users')
            .select('id, name')
            .in('id', reviewerIds);
          
          if (reviewersData) {
            setReviewers(reviewersData as SimpleUser[]);
          }
        }
      } catch (error) {
        console.error("Error fetching active orders:", error);
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive",
        });
      }
    };

    const fetchRestaurants = async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*');

      if (error) {
        console.error("Error fetching restaurants:", error);
        toast({
          title: "Error",
          description: "Failed to load restaurants",
          variant: "destructive",
        });
      } else {
        setRestaurants(data || []);
      }
    };

    fetchActiveOrders();
    fetchRestaurants();
    refetchReviews();
  }, [user, toast, refetchReviews, reviews.length]);

  // Redirect if user is not a courier
  if (!user || user.user_type !== 'courier') {
    return <Navigate to="/" />;
  }

  const mapLocations = activeOrders.flatMap(order => {
    const locations = [];
    
    // Add restaurant location if available
    const restaurant = restaurants.find(r => r.id === order.restaurant_id);
    if (restaurant) {
      locations.push({ 
        id: `restaurant-${restaurant.id}`,
        lat: restaurant.lat,
        lng: restaurant.lng,
        type: 'restaurant' as MapLocationType,
        name: restaurant.name
      });
    }
    
    // Add delivery location
    locations.push({
      id: `delivery-${order.id}`,
      lat: order.delivery_lat,
      lng: order.delivery_lng,
      type: 'user' as MapLocationType,
      name: 'Delivery Location'
    });
    
    // Add courier location (current user)
    if (user) {
      locations.push({
        id: 'courier',
        lat: user.lat,
        lng: user.lng,
        type: 'courier' as MapLocationType,
        name: 'Your Location'
      });
    }
    
    return locations;
  });

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)
        .eq('courier_id', user?.id);

      if (error) {
        console.error("Error updating order status:", error);
        toast({
          title: "Error",
          description: "Could not update order status",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `Order status updated to ${newStatus}`,
        });

        // Optimistically update the local state
        setActiveOrders(prevOrders =>
          prevOrders.map(order =>
            order.id === orderId ? { ...order, status: newStatus } : order
          )
        );
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="active">
          <TabsList className="mb-4">
            <TabsTrigger value="active">Active Orders</TabsTrigger>
            <TabsTrigger value="reviews">Your Reviews</TabsTrigger>
          </TabsList>
          
          <TabsContent value="active">
            <h1 className="text-2xl font-bold mb-4">Active Orders</h1>

            {activeOrders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-1">
                  {activeOrders.map(order => {
                    // Calculate distances
                    const restaurantDistance = calculateDistance(
                      user?.lat || 0, 
                      user?.lng || 0, 
                      order.restaurant_lat, 
                      order.restaurant_lng
                    );
                    
                    const customerDistance = calculateDistance(
                      user?.lat || 0, 
                      user?.lng || 0, 
                      order.delivery_lat, 
                      order.delivery_lng
                    );
                    
                    return (
                      <div key={order.id} className="border p-4 rounded mb-4">
                        <h2 className="text-lg font-bold">{order.restaurant_name}</h2>
                        <p className="text-gray-600">{order.restaurant_address}</p>
                        <div className="flex items-center text-sm text-blue-600 mt-1">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>{formatDistance(restaurantDistance)} from you</span>
                        </div>
                        
                        <p className="mt-3">
                          Delivery to: {order.delivery_address}
                        </p>
                        <div className="flex items-center text-sm text-blue-600 mt-1">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>{formatDistance(customerDistance)} from you</span>
                        </div>
                        
                        <p className="mt-3">
                          Status: <span className="font-medium">{order.status}</span>
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(order.created_at), {
                            addSuffix: true,
                          })}
                        </p>

                        <div className="mt-4 flex justify-between">
                          {order.status === 'picked_up' && (
                            <Button onClick={() => handleStatusUpdate(order.id, 'on_the_way')}>
                              Mark as On the Way
                            </Button>
                          )}
                          {order.status === 'on_the_way' && (
                            <Button onClick={() => handleStatusUpdate(order.id, 'delivered')}>
                              Mark as Delivered
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="md:col-span-1">
                  <div className="bg-gray-100 rounded overflow-hidden" style={{ height: '400px' }}>
                    <Map locations={mapLocations} />
                  </div>
                </div>
              </div>
            ) : (
              <p>No active orders</p>
            )}
          </TabsContent>
          
          <TabsContent value="reviews">
            <h1 className="text-2xl font-bold mb-4">Your Reviews</h1>
            
            <div className="mb-6">
              <ReviewStats reviews={reviews} />
              <ReviewList reviews={reviews} reviewers={reviewers} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CourierActiveOrders;
