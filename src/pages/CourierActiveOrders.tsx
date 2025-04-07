
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import NavBar from '@/components/NavBar';
import LoadingState from '@/components/restaurant/LoadingState';
import ReviewStats from '@/components/ReviewStats';
import ReviewList from '@/components/ReviewList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ActiveOrderCard from '@/components/courier/ActiveOrderCard';
import CourierMapLocations from '@/components/courier/CourierMapLocations';
import { useCourierActiveOrders } from '@/hooks/useCourierActiveOrders';

const CourierActiveOrders = () => {
  const { user } = useAuth();
  const { 
    activeOrders, 
    restaurants, 
    reviews, 
    reviewers, 
    loading, 
    updateOrderStatus 
  } = useCourierActiveOrders(user?.id);

  // Redirect if user is not a courier
  if (!user || user.user_type !== 'courier') {
    return <Navigate to="/" />;
  }

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

            {loading ? (
              <LoadingState message="Loading your active orders..." />
            ) : activeOrders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-1">
                  {activeOrders.map(order => (
                    <ActiveOrderCard
                      key={order.id}
                      id={order.id}
                      restaurantName={order.restaurant_name}
                      restaurantAddress={order.restaurant_address}
                      restaurantLat={order.restaurant_lat}
                      restaurantLng={order.restaurant_lng}
                      deliveryAddress={order.delivery_address}
                      deliveryLat={order.delivery_lat}
                      deliveryLng={order.delivery_lng}
                      status={order.status}
                      createdAt={order.created_at}
                      userLat={user?.lat || 0}
                      userLng={user?.lng || 0}
                      onStatusUpdate={updateOrderStatus}
                    />
                  ))}
                </div>

                <div className="md:col-span-1">
                  <CourierMapLocations 
                    activeOrders={activeOrders}
                    restaurants={restaurants}
                    userLocation={{ lat: user.lat, lng: user.lng }}
                  />
                </div>
              </div>
            ) : (
              <p>No active orders</p>
            )}
          </TabsContent>
          
          <TabsContent value="reviews">
            <h1 className="text-2xl font-bold mb-4">Your Reviews</h1>
            
            {loading ? (
              <LoadingState message="Loading your reviews..." />
            ) : (
              <div className="mb-6">
                <ReviewStats reviews={reviews} />
                <ReviewList reviews={reviews} reviewers={reviewers} />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CourierActiveOrders;
