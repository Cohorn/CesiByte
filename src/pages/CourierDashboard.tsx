
import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import NavBar from '@/components/NavBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PackageOpen, Navigation, Clock, Star } from 'lucide-react';
import { useReviews } from '@/hooks/useReviews';
import CourierRatingDisplay from '@/components/courier/CourierRatingDisplay';

const CourierDashboard = () => {
  const { user } = useAuth();
  const { averageRating } = useReviews({ courierId: user?.id });
  
  // Redirect if user is not a courier
  if (!user || user.user_type !== 'courier') {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Courier Dashboard</h1>
          <CourierRatingDisplay rating={averageRating.average} />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-white shadow hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center">
                <PackageOpen className="mr-2 h-5 w-5 text-blue-500" />
                Available Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Browse and accept available delivery orders in your area.
              </p>
              <Button asChild variant="default">
                <Link to="/courier/available-orders">View Available Orders</Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center">
                <Navigation className="mr-2 h-5 w-5 text-green-500" />
                Active Deliveries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Manage your current active deliveries and track their status.
              </p>
              <Button asChild variant="default">
                <Link to="/courier/active-orders">Manage Active Deliveries</Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5 text-purple-500" />
                Delivery History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                View your past deliveries and performance metrics.
              </p>
              <Button asChild variant="outline">
                <Link to="/courier/active-orders?tab=past">View History</Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center">
                <Star className="mr-2 h-5 w-5 text-yellow-500" />
                Ratings & Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                See your customer ratings and feedback on your deliveries.
              </p>
              <Button asChild variant="outline">
                <Link to="/profile#reviews">View Ratings</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CourierDashboard;
