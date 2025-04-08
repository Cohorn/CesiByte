
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import NavBar from '@/components/NavBar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useReviews } from '@/hooks/useReviews';

// Simple analytics authentication
const EMPLOYEE_PASSWORD = "supersecret";

interface AnalyticsData {
  restaurantCount: number;
  customerCount: number;
  courierCount: number;
  orderCount: number;
  restaurantSatisfaction: number;
  courierSatisfaction: number;
  ordersPerDay: { date: string; orders: number }[];
  topRestaurants: { id: string; name: string; rating: number }[];
  worstRestaurants: { id: string; name: string; rating: number }[];
  topCouriers: { id: string; name: string; rating: number }[];
  worstCouriers: { id: string; name: string; rating: number }[];
}

const Analytics = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password === EMPLOYEE_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('analyticsAuth', 'true');
      toast({
        title: "Access Granted",
        description: "Welcome to the analytics dashboard",
      });
    } else {
      toast({
        title: "Access Denied",
        description: "Invalid password",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    // Check if already authenticated
    if (localStorage.getItem('analyticsAuth') === 'true') {
      setIsAuthenticated(true);
    }
    
    // If authenticated, fetch analytics data
    if (isAuthenticated) {
      fetchAnalyticsData();
    }
  }, [isAuthenticated]);

  const fetchAnalyticsData = async () => {
    setIsLoading(true);
    
    try {
      // Fetch restaurants count
      const { count: restaurantCount, error: restaurantError } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('user_type', 'restaurant');
      
      // Fetch customers count
      const { count: customerCount, error: customerError } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('user_type', 'customer');
      
      // Fetch couriers count
      const { count: courierCount, error: courierError } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('user_type', 'courier');
      
      // Fetch orders count
      const { count: orderCount, error: orderError } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true });
      
      // Fetch restaurant satisfaction ratings
      const { data: restaurantReviews, error: restaurantReviewsError } = await supabase
        .from('reviews')
        .select('rating')
        .not('restaurant_id', 'is', null);
      
      // Fetch courier satisfaction ratings
      const { data: courierReviews, error: courierReviewsError } = await supabase
        .from('reviews')
        .select('rating')
        .not('courier_id', 'is', null);
      
      // Calculate average satisfaction
      const restaurantSatisfaction = restaurantReviews && restaurantReviews.length > 0
        ? restaurantReviews.reduce((sum, review) => sum + review.rating, 0) / restaurantReviews.length
        : 0;
      
      const courierSatisfaction = courierReviews && courierReviews.length > 0
        ? courierReviews.reduce((sum, review) => sum + review.rating, 0) / courierReviews.length
        : 0;
      
      // Fetch orders per day (last 7 days)
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      
      const { data: recentOrders, error: recentOrdersError } = await supabase
        .from('orders')
        .select('created_at')
        .gte('created_at', lastWeek.toISOString());
      
      // Group orders by day
      const ordersByDay = recentOrders?.reduce((acc: Record<string, number>, order) => {
        const day = new Date(order.created_at).toISOString().split('T')[0];
        acc[day] = (acc[day] || 0) + 1;
        return acc;
      }, {}) || {};
      
      // Format for chart
      const ordersPerDay = Object.entries(ordersByDay).map(([date, orders]) => ({
        date,
        orders,
      }));
      
      // Fetch top 10 restaurants by rating
      const { data: restaurantsData, error: restaurantsError } = await supabase
        .from('users')
        .select('id, name')
        .eq('user_type', 'restaurant');

      // Fetch all restaurant reviews
      const { data: allRestaurantReviews, error: allRestaurantReviewsError } = await supabase
        .from('reviews')
        .select('restaurant_id, rating')
        .not('restaurant_id', 'is', null);

      // Calculate average rating per restaurant
      const restaurantRatings: Record<string, { totalRating: number, count: number }> = {};
      allRestaurantReviews?.forEach(review => {
        if (!restaurantRatings[review.restaurant_id!]) {
          restaurantRatings[review.restaurant_id!] = { totalRating: 0, count: 0 };
        }
        restaurantRatings[review.restaurant_id!].totalRating += review.rating;
        restaurantRatings[review.restaurant_id!].count += 1;
      });

      // Create restaurant rating array with names
      const restaurantRatingArray = restaurantsData?.map(restaurant => {
        const ratings = restaurantRatings[restaurant.id];
        return {
          id: restaurant.id,
          name: restaurant.name,
          rating: ratings ? ratings.totalRating / ratings.count : 0
        };
      }).filter(r => r.rating > 0) || [];

      // Sort for top and worst
      const topRestaurants = [...restaurantRatingArray].sort((a, b) => b.rating - a.rating).slice(0, 10);
      const worstRestaurants = [...restaurantRatingArray].sort((a, b) => a.rating - b.rating).slice(0, 10);

      // Fetch top 10 couriers by rating
      const { data: couriersData, error: couriersError } = await supabase
        .from('users')
        .select('id, name')
        .eq('user_type', 'courier');

      // Fetch all courier reviews
      const { data: allCourierReviews, error: allCourierReviewsError } = await supabase
        .from('reviews')
        .select('courier_id, rating')
        .not('courier_id', 'is', null);

      // Calculate average rating per courier
      const courierRatings: Record<string, { totalRating: number, count: number }> = {};
      allCourierReviews?.forEach(review => {
        if (!courierRatings[review.courier_id!]) {
          courierRatings[review.courier_id!] = { totalRating: 0, count: 0 };
        }
        courierRatings[review.courier_id!].totalRating += review.rating;
        courierRatings[review.courier_id!].count += 1;
      });

      // Create courier rating array with names
      const courierRatingArray = couriersData?.map(courier => {
        const ratings = courierRatings[courier.id];
        return {
          id: courier.id,
          name: courier.name,
          rating: ratings ? ratings.totalRating / ratings.count : 0
        };
      }).filter(c => c.rating > 0) || [];

      // Sort for top and worst
      const topCouriers = [...courierRatingArray].sort((a, b) => b.rating - a.rating).slice(0, 10);
      const worstCouriers = [...courierRatingArray].sort((a, b) => a.rating - b.rating).slice(0, 10);
      
      if (restaurantError || customerError || courierError || orderError || 
          restaurantReviewsError || courierReviewsError || recentOrdersError ||
          restaurantsError || allRestaurantReviewsError || couriersError || allCourierReviewsError) {
        throw new Error('Error fetching analytics data');
      }
      
      setAnalyticsData({
        restaurantCount: restaurantCount || 0,
        customerCount: customerCount || 0,
        courierCount: courierCount || 0,
        orderCount: orderCount || 0,
        restaurantSatisfaction,
        courierSatisfaction,
        ordersPerDay,
        topRestaurants,
        worstRestaurants,
        topCouriers,
        worstCouriers,
      });
      
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('analyticsAuth');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <NavBar />
        <div className="container mx-auto px-4 py-8 flex-grow flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">Analytics Login</CardTitle>
              <CardDescription className="text-center">
                Enter the employee password to access analytics
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter employee password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full"
                    required
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full"
                >
                  Access Analytics
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          <Button variant="outline" onClick={handleLogout}>Logout</Button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <p>Loading analytics data...</p>
          </div>
        ) : analyticsData ? (
          <div className="space-y-6">
            {/* User stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Restaurants</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{analyticsData.restaurantCount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Customers</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{analyticsData.customerCount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Couriers</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{analyticsData.courierCount}</p>
                </CardContent>
              </Card>
            </div>
            
            {/* Order stats and satisfaction ratings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{analyticsData.orderCount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Restaurant Satisfaction</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{analyticsData.restaurantSatisfaction.toFixed(1)} / 5</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Courier Satisfaction</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{analyticsData.courierSatisfaction.toFixed(1)} / 5</p>
                </CardContent>
              </Card>
            </div>
            
            {/* Orders chart */}
            <Card className="h-[400px]">
              <CardHeader>
                <CardTitle>Orders Last 7 Days</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={analyticsData.ordersPerDay}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="orders" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Restaurants */}
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Restaurants</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analyticsData.topRestaurants.length > 0 ? (
                      analyticsData.topRestaurants.map((restaurant, index) => (
                        <TableRow key={restaurant.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{restaurant.name}</TableCell>
                          <TableCell>{restaurant.rating.toFixed(1)} / 5</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center">No rated restaurants</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Worst Restaurants */}
            <Card>
              <CardHeader>
                <CardTitle>Bottom 10 Restaurants</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analyticsData.worstRestaurants.length > 0 ? (
                      analyticsData.worstRestaurants.map((restaurant, index) => (
                        <TableRow key={restaurant.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{restaurant.name}</TableCell>
                          <TableCell>{restaurant.rating.toFixed(1)} / 5</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center">No rated restaurants</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Top Couriers */}
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Couriers</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analyticsData.topCouriers.length > 0 ? (
                      analyticsData.topCouriers.map((courier, index) => (
                        <TableRow key={courier.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{courier.name}</TableCell>
                          <TableCell>{courier.rating.toFixed(1)} / 5</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center">No rated couriers</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Worst Couriers */}
            <Card>
              <CardHeader>
                <CardTitle>Bottom 10 Couriers</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analyticsData.worstCouriers.length > 0 ? (
                      analyticsData.worstCouriers.map((courier, index) => (
                        <TableRow key={courier.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{courier.name}</TableCell>
                          <TableCell>{courier.rating.toFixed(1)} / 5</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center">No rated couriers</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex justify-center items-center h-64">
            <p>No analytics data available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
