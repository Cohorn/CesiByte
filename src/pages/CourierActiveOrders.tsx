
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useCourierActiveOrders } from '@/hooks/useCourierActiveOrders';
import NavBar from '@/components/NavBar';
import { OrderStatus } from '@/lib/database.types';
import ActiveOrderCard from '@/components/courier/ActiveOrderCard';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import DeliveryPinInput from '@/components/courier/DeliveryPinInput';
import { useOrders } from '@/hooks/useOrders';

const CourierActiveOrders: React.FC = () => {
  const { user } = useAuth();
  const { activeOrders, loading, error, refetch, updateOrderStatus } = useCourierActiveOrders(user?.id || null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState({ lat: 0, lng: 0 });
  
  // Fetch past orders separately
  const { 
    orders: pastOrders, 
    isLoading: pastOrdersLoading, 
    error: pastOrdersError,
    verifyDeliveryPin 
  } = useOrders({
    courierId: user?.id,
    status: ['delivered', 'completed'] as OrderStatus[]
  });

  // Set courier location from user profile
  useEffect(() => {
    if (user) {
      setUserLocation({ lat: user.lat || 0, lng: user.lng || 0 });
    }
  }, [user]);

  const handleStatusUpdate = async (orderId: string, status: OrderStatus) => {
    await updateOrderStatus(orderId, status);
    refetch(); // Refresh the list after updating
  };

  const handlePinVerification = async (orderId: string, pin: string) => {
    if (!verifyDeliveryPin) {
      console.error("verifyDeliveryPin function not available");
      return { success: false, message: "Verification not available" };
    }
    
    try {
      const result = await verifyDeliveryPin(orderId, pin);
      if (result.success) {
        refetch(); // Refresh the list after successful verification
      }
      return result;
    } catch (error) {
      console.error("Error verifying PIN:", error);
      return { success: false, message: "Verification failed" };
    }
  };

  if (loading || pastOrdersLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="container mx-auto py-8">
          <h1 className="text-2xl font-bold mb-4">Your Active Deliveries</h1>
          <Card className="p-8 text-center">
            <p className="text-gray-500">Loading orders...</p>
          </Card>
        </div>
      </div>
    );
  }

  if (error || pastOrdersError) {
    const displayError = error || pastOrdersError;
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="container mx-auto py-8">
          <h1 className="text-2xl font-bold mb-4">Your Active Deliveries</h1>
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {displayError instanceof Error ? displayError.message : "An error occurred"}
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

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Your Deliveries</h1>
        
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="active">Active Deliveries ({activeOrders.length})</TabsTrigger>
            <TabsTrigger value="past">Past Deliveries ({pastOrders?.length || 0})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="active">
            {activeOrders.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-gray-500">You don't have any active deliveries.</p>
                <p className="text-gray-500 mt-2">Check the available orders to pick up new deliveries.</p>
              </Card>
            ) : (
              <div className="space-y-4">
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
                    userLat={userLocation.lat}
                    userLng={userLocation.lng}
                    onStatusUpdate={handleStatusUpdate}
                    onVerifyPin={handlePinVerification}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="past">
            {!pastOrders || pastOrders.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-gray-500">You don't have any past deliveries.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {pastOrders.map(order => (
                  <Card key={order.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">Order #{order.id.substring(0, 8)}</h3>
                        <p className="text-sm text-gray-600">Delivered to: {order.delivery_address}</p>
                        <p className="text-sm text-gray-600">Status: <span className="capitalize">{order.status.replace(/_/g, ' ')}</span></p>
                        <p className="text-sm font-medium mt-2">Amount: ${order.total_price.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                          Completed
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CourierActiveOrders;
