import React, { useState, useCallback } from 'react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CourierRatingDisplay from '@/components/courier/CourierRatingDisplay';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrders } from '@/hooks/useOrders';
import { useToast } from '@/hooks/use-toast';

const CourierActiveOrders = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('active');
  const { toast } = useToast();
  
  const { 
    activeOrders, 
    restaurants, 
    reviews, 
    reviewers, 
    averageRating,
    loading, 
    error,
    updateOrderStatus,
    refetch
  } = useCourierActiveOrders(user?.id);
  
  // Get the verifyDeliveryPin function from useOrders hook
  const { verifyDeliveryPin } = useOrders({ courierId: user?.id });

  // Callback for PIN verification
  const handleVerifyPin = useCallback(async (orderId: string, pin: string) => {
    try {
      console.log(`Verifying PIN for order ${orderId} with value ${pin}`);
      const result = await verifyDeliveryPin(orderId, pin);
      
      if (result.success) {
        toast({
          title: "Delivery Confirmed",
          description: "PIN verified successfully. Delivery completed!"
        });
        
        // If PIN is verified, refetch orders to update the UI
        refetch();
        return { success: true, message: "Delivery confirmed" };
      } else {
        const errorMessage = result.message || "Invalid PIN";
        console.error("PIN verification failed:", errorMessage);
        
        toast({
          title: "Verification Failed",
          description: errorMessage,
          variant: "destructive"
        });
        
        return { success: false, message: errorMessage };
      }
    } catch (err) {
      const error = err as Error;
      console.error("Error verifying PIN:", error);
      
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
      
      return { success: false, message: "An unexpected error occurred" };
    }
  }, [verifyDeliveryPin, refetch, toast]);

  // Redirect if user is not a courier
  if (!user || user.user_type !== 'courier') {
    return <Navigate to="/" />;
  }

  // Separate loading state for initial load vs refresh
  const isInitialLoading = loading && (activeOrders.length === 0 && reviews.length === 0);

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Courier Dashboard</h1>
          {loading && !averageRating ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            averageRating !== null && (
              <CourierRatingDisplay rating={averageRating} />
            )
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="active">Active Orders</TabsTrigger>
            <TabsTrigger value="reviews">Your Reviews</TabsTrigger>
          </TabsList>
          
          <TabsContent value="active">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Active Orders</h2>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                disabled={loading}
                className="flex items-center gap-1"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            )}

            {isInitialLoading ? (
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
                      onVerifyPin={handleVerifyPin}
                    />
                  ))}
                </div>

                <div className="md:col-span-1">
                  <CourierMapLocations 
                    activeOrders={activeOrders}
                    restaurants={restaurants || []}
                    userLocation={{ lat: user.lat || 0, lng: user.lng || 0 }}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-white shadow rounded-lg p-6 text-center">
                <p className="text-gray-500 mb-4">You don't have any active orders at the moment.</p>
                <Button variant="outline" onClick={() => refetch()}>
                  Check for new assignments
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="reviews">
            <h2 className="text-xl font-semibold mb-4">Your Reviews</h2>
            
            {isInitialLoading ? (
              <LoadingState message="Loading your reviews..." />
            ) : error ? (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            ) : reviews && reviews.length > 0 ? (
              <div className="mb-6">
                <ReviewStats reviews={reviews} />
                <ReviewList reviews={reviews} reviewers={reviewers || []} />
              </div>
            ) : (
              <div className="bg-white shadow rounded-lg p-6 text-center">
                <p className="text-gray-500">You haven't received any reviews yet.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CourierActiveOrders;
