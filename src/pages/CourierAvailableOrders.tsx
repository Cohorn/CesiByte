
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import NavBar from '@/components/NavBar';
import { Button } from '@/components/ui/button';
import { useReviews } from '@/hooks/useReviews';
import { useAvailableOrders } from '@/hooks/useCourierOrders';
import LoadingState from '@/components/restaurant/LoadingState';
import OrdersList from '@/components/courier/OrdersList';
import CourierRatingDisplay from '@/components/courier/CourierRatingDisplay';

const CourierAvailableOrders = () => {
  const { user } = useAuth();
  const { 
    availableOrders, 
    restaurants, 
    loading, 
    lastFetched,
    fetchAvailableOrders,
    acceptOrder,
    getLastFetchedText
  } = useAvailableOrders();
  const { averageRating } = useReviews({ courierId: user?.id });

  const handleAcceptOrder = async (orderId: string) => {
    if (!user) return;
    await acceptOrder(orderId, user.id);
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
          <CourierRatingDisplay rating={averageRating} />
        </div>

        <div className="mb-2 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            {getLastFetchedText()}
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
          <LoadingState message="Loading available orders..." />
        ) : (
          <OrdersList 
            orders={availableOrders}
            restaurants={restaurants}
            userLocation={{ lat: user.lat, lng: user.lng }}
            onAcceptOrder={handleAcceptOrder}
            canUpdateStatus={true}
          />
        )}
      </div>
    </div>
  );
};

export default CourierAvailableOrders;
