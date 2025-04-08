
import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Restaurant } from '@/lib/database.types';
import { useAuth, isEmployeeType, isDeveloper, isCommercialAgent } from '@/lib/AuthContext';
import { restaurantApi } from '@/api/services/restaurantService';
import NavBar from '@/components/NavBar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Store, Truck, Utensils, User, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect employee users to their dashboard
  useEffect(() => {
    if (user && isEmployeeType(user)) {
      navigate('/employee/dashboard');
    }
  }, [user, navigate]);

  // Fetch featured restaurants
  const { data: restaurants, isLoading } = useQuery({
    queryKey: ['featured-restaurants'],
    queryFn: async () => {
      try {
        return await restaurantApi.getFeaturedRestaurants();
      } catch (error) {
        console.error('Error fetching featured restaurants:', error);
        return [];
      }
    }
  });

  // Handle role selection
  const handleRoleSelect = (role: 'customer' | 'restaurant' | 'courier') => {
    if (!user) {
      navigate(`/register?type=${role}`);
    } else if (user.user_type !== role) {
      toast({
        title: "Action Required",
        description: `You're currently registered as a ${user.user_type}. Please create a new account to use the ${role} portal.`,
      });
    } else {
      // Navigate to appropriate dashboard based on role
      switch (role) {
        case 'customer':
          navigate('/restaurants');
          break;
        case 'restaurant':
          navigate('/restaurant/orders');
          break;
        case 'courier':
          navigate('/courier/available-orders');
          break;
      }
    }
  };

  // If user is an employee, we'll redirect in the useEffect above
  if (user && isEmployeeType(user)) {
    return null; // Returning null while redirect happens
  }

  return (
    <div className="flex flex-col min-h-screen">
      <NavBar />
      
      <main className="flex-grow">
        {/* Hero section */}
        <section className="bg-gradient-to-r from-primary/10 to-primary/5 py-16 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <h1 className="text-4xl font-bold mb-4">Delicious food, delivered fast</h1>
                <p className="text-xl text-gray-600 mb-6">
                  Order from your favorite restaurants and track your delivery in real-time.
                </p>
                <div className="space-x-4">
                  {user?.user_type === 'customer' ? (
                    <Button size="lg" asChild>
                      <Link to="/restaurants">
                        Browse Restaurants <ArrowRight className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>
                  ) : (
                    <Button size="lg" onClick={() => handleRoleSelect('customer')}>
                      {!user ? "Sign Up to Order" : "Order Food"} <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="hidden lg:block">
                <img 
                  src="/placeholder.svg" 
                  alt="Food Delivery"
                  className="rounded-lg shadow-lg" 
                />
              </div>
            </div>
          </div>
        </section>
        
        {/* Featured restaurants */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold mb-8 text-center">Popular Restaurants</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoading ? (
                Array(3).fill(0).map((_, index) => (
                  <Card key={index} className="animate-pulse">
                    <div className="h-48 bg-gray-200 rounded-t-lg" />
                    <CardHeader>
                      <div className="h-7 bg-gray-200 rounded w-3/4" />
                      <div className="h-4 bg-gray-100 rounded w-1/2" />
                    </CardHeader>
                    <CardContent>
                      <div className="h-4 bg-gray-100 rounded w-full mb-2" />
                      <div className="h-4 bg-gray-100 rounded w-5/6" />
                    </CardContent>
                  </Card>
                ))
              ) : restaurants && restaurants.length > 0 ? (
                restaurants.map((restaurant: Restaurant) => (
                  <Card key={restaurant.id}>
                    <div 
                      className="h-48 bg-gray-200 rounded-t-lg bg-center bg-cover"
                      style={{ backgroundImage: restaurant.image_url ? `url(${restaurant.image_url})` : 'none' }}
                    />
                    <CardHeader>
                      <CardTitle>{restaurant.name}</CardTitle>
                      <CardDescription>{restaurant.address}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="line-clamp-2 text-gray-600">
                        Delicious food from {restaurant.name} delivered right to your door.
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button asChild className="w-full">
                        <Link to={`/restaurant/${restaurant.id}`}>
                          View Menu
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-8">
                  <p className="text-gray-500">No restaurants found. Check back later!</p>
                </div>
              )}
            </div>
          </div>
        </section>
        
        {/* Role selection section */}
        <section className="py-16 px-4 bg-gray-50">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold mb-2 text-center">Join Our Platform</h2>
            <p className="text-xl text-gray-600 mb-12 text-center">
              Choose your role and get started
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="border-primary/20 hover:border-primary transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Customer</CardTitle>
                  <CardDescription>
                    Order food from your favorite restaurants
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                      Browse local restaurants
                    </li>
                    <li className="flex items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                      Track orders in real-time
                    </li>
                    <li className="flex items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                      Rate your experience
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    onClick={() => handleRoleSelect('customer')}
                  >
                    {user?.user_type === 'customer' ? 'Go to Dashboard' : 'Start Ordering'}
                  </Button>
                </CardFooter>
              </Card>
              
              <Card className="border-primary/20 hover:border-primary transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Store className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Restaurant</CardTitle>
                  <CardDescription>
                    Grow your business with our platform
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                      Manage your menu
                    </li>
                    <li className="flex items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                      Process orders efficiently
                    </li>
                    <li className="flex items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                      Increase customer reach
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    onClick={() => handleRoleSelect('restaurant')}
                  >
                    {user?.user_type === 'restaurant' ? 'Go to Dashboard' : 'Partner with Us'}
                  </Button>
                </CardFooter>
              </Card>
              
              <Card className="border-primary/20 hover:border-primary transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Truck className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Courier</CardTitle>
                  <CardDescription>
                    Flexible delivery jobs on your schedule
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                      Choose your working hours
                    </li>
                    <li className="flex items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                      Earn competitive pay
                    </li>
                    <li className="flex items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                      Easy-to-use delivery app
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    onClick={() => handleRoleSelect('courier')}
                  >
                    {user?.user_type === 'courier' ? 'Go to Dashboard' : 'Start Delivering'}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
