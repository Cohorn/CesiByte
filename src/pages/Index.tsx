
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import NavBar from '@/components/NavBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Utensils, ShoppingBag, Truck, Briefcase, ArrowRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const Index = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  // Check if user is any type of employee
  const isEmployeeType = user?.user_type === 'employee' || user?.user_type === 'dev' || user?.user_type === 'com_agent';

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      
      <div className="flex-grow bg-gradient-to-b from-background to-secondary/30">
        <div className="container mx-auto px-4 py-8 md:py-16 lg:py-20">
          <div className="max-w-5xl mx-auto mb-12 md:mb-16">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6 md:mb-8 text-foreground animate-fade-in text-center">
              Welcome to <span className="inline-block">
                <span className="bg-yellow-300 text-black px-2 py-1 rounded-l-md">C</span>
                <span className="text-primary">esiByte</span>
              </span>
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl mb-4 text-muted-foreground text-center">
              Food for thought, Engineer's favourite
            </p>
            <p className="text-base md:text-lg mb-10 md:mb-12 text-muted-foreground max-w-2xl mx-auto text-center">
              Your simple and delicious food delivery service crafted for engineers who appreciate 
              both efficiency and exceptional flavors
            </p>
            
            {!user ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <Card className="food-card card-hover shadow-md border-2 border-border/50 h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center">
                      <ShoppingBag className="h-5 w-5 mr-2 text-primary" />
                      Order Food
                    </CardTitle>
                    <CardDescription>
                      Sign up as a Customer
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 flex flex-col h-full">
                    <p className="mb-6 text-sm flex-grow">Browse restaurants and get delicious food delivered to your doorstep.</p>
                    <Button asChild className="w-full group">
                      <Link to="/register?type=customer">
                        Get Started
                        <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
                
                <Card className="food-card card-hover shadow-md border-2 border-border/50 h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center">
                      <Utensils className="h-5 w-5 mr-2 text-primary" />
                      Add Your Restaurant
                    </CardTitle>
                    <CardDescription>
                      Sign up as a Restaurant
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 flex flex-col h-full">
                    <p className="mb-6 text-sm flex-grow">Join our platform and reach more customers with your delicious menu.</p>
                    <Button asChild className="w-full group">
                      <Link to="/register?type=restaurant">
                        Join Now
                        <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
                
                <Card className="food-card card-hover shadow-md border-2 border-border/50 h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center">
                      <Truck className="h-5 w-5 mr-2 text-primary" />
                      Become a Courier
                    </CardTitle>
                    <CardDescription>
                      Sign up as a Courier
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 flex flex-col h-full">
                    <p className="mb-6 text-sm flex-grow">Earn money by delivering food from restaurants to hungry customers.</p>
                    <Button asChild className="w-full group">
                      <Link to="/register?type=courier">
                        Start Delivering
                        <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
                
                <Card className="food-card card-hover shadow-md border-2 border-border/50 h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center">
                      <Briefcase className="h-5 w-5 mr-2 text-primary" />
                      Employee Access
                    </CardTitle>
                    <CardDescription>
                      Sign up as an Employee
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 flex flex-col h-full">
                    <p className="mb-6 text-sm flex-grow">Manage the platform, assist customers and restaurants, or access developer tools.</p>
                    <Button asChild className="w-full group">
                      <Link to="/register?type=employee">
                        Join Team
                        <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="max-w-md mx-auto">
                <Card className="food-card shadow-lg border-2 border-border/50">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-2xl">
                      {user.user_type === 'customer' ? 'Ready to Order?' :
                       user.user_type === 'restaurant' ? 'Manage Your Restaurant' :
                       user.user_type === 'courier' ? 'Start Delivering' :
                       isEmployeeType ? 'Access Dashboard' : ''}
                    </CardTitle>
                    <CardDescription className="text-md">
                      {user.user_type === 'customer' ? 'Find your favorite food' :
                       user.user_type === 'restaurant' ? 'Update your menu and manage orders' :
                       user.user_type === 'courier' ? 'Deliver food and earn money' :
                       user.user_type === 'dev' ? 'Access developer tools' :
                       user.user_type === 'com_agent' ? 'Manage platform users' :
                       user.user_type === 'employee' ? 'Access your employee tools' : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    {user.user_type === 'customer' && (
                      <Button asChild className="w-full group">
                        <Link to="/restaurants">
                          Browse Restaurants
                          <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                        </Link>
                      </Button>
                    )}
                    
                    {user.user_type === 'restaurant' && (
                      <div className="flex flex-col space-y-4">
                        <Button asChild variant="default" className="group">
                          <Link to="/restaurant/menu">
                            Manage Menu
                            <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                          </Link>
                        </Button>
                        <Button asChild variant="outline" className="group">
                          <Link to="/restaurant/orders">
                            View Orders
                            <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                          </Link>
                        </Button>
                      </div>
                    )}
                    
                    {user.user_type === 'courier' && (
                      <Button asChild className="w-full group">
                        <Link to="/courier/available">
                          Find Delivery Orders
                          <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                        </Link>
                      </Button>
                    )}
                    
                    {isEmployeeType && (
                      <Button asChild className="w-full group">
                        <Link to="/employee/dashboard">
                          Access Dashboard
                          <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
