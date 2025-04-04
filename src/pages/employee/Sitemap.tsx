
import React from 'react';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import NavBar from '@/components/NavBar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, Store, Truck, MapPin, ShoppingBag, Menu, Clock,
  Home, LogIn, LayoutDashboard, User, Settings, FileText,
  Package, Utensils, AlertCircle, BarChart, Layers, Terminal
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';

type SitemapPage = {
  title: string;
  path: string;
  description: string;
  icon: React.ElementType;
  userType: 'all' | 'anonymous' | 'customer' | 'restaurant' | 'courier' | 'employee';
  category: string;
};

const pages: SitemapPage[] = [
  // Public pages
  { title: 'Home', path: '/', description: 'Landing page with service overview', icon: Home, userType: 'all', category: 'Public' },
  { title: 'Login', path: '/login', description: 'Authentication for all user types', icon: LogIn, userType: 'anonymous', category: 'Public' },
  { title: 'Register', path: '/register', description: 'Account creation for new users', icon: FileText, userType: 'anonymous', category: 'Public' },
  
  // Customer pages
  { title: 'Restaurants', path: '/restaurants', description: 'Browse all available restaurants', icon: Store, userType: 'customer', category: 'Customer' },
  { title: 'Restaurant Detail', path: '/restaurant/1', description: 'View restaurant menu and details', icon: Utensils, userType: 'customer', category: 'Customer' },
  { title: 'Customer Orders', path: '/orders', description: 'Track and manage orders', icon: Package, userType: 'customer', category: 'Customer' },
  { title: 'Customer Profile', path: '/profile', description: 'Manage account settings', icon: User, userType: 'customer', category: 'Customer' },
  
  // Restaurant pages
  { title: 'Restaurant Setup', path: '/restaurant/setup', description: 'Configure restaurant details', icon: Settings, userType: 'restaurant', category: 'Restaurant' },
  { title: 'Restaurant Menu', path: '/restaurant/menu', description: 'Manage menu items', icon: Menu, userType: 'restaurant', category: 'Restaurant' },
  { title: 'Restaurant Orders', path: '/restaurant/orders', description: 'Process incoming orders', icon: ShoppingBag, userType: 'restaurant', category: 'Restaurant' },
  { title: 'Restaurant Profile', path: '/profile', description: 'Manage account settings', icon: User, userType: 'restaurant', category: 'Restaurant' },
  
  // Courier pages
  { title: 'Available Orders', path: '/courier/available', description: 'Browse orders available for pickup', icon: Package, userType: 'courier', category: 'Courier' },
  { title: 'Active Orders', path: '/courier/active', description: 'Track orders in delivery', icon: Truck, userType: 'courier', category: 'Courier' },
  { title: 'Courier Profile', path: '/profile', description: 'Manage account settings', icon: User, userType: 'courier', category: 'Courier' },
  
  // Employee pages
  { title: 'Employee Dashboard', path: '/employee/dashboard', description: 'Central hub for employee operations', icon: LayoutDashboard, userType: 'employee', category: 'Employee' },
  { title: 'Customer Management', path: '/employee/customers', description: 'Manage customer accounts', icon: Users, userType: 'employee', category: 'Employee' },
  { title: 'Restaurant Management', path: '/employee/restaurants', description: 'Manage restaurant accounts', icon: Store, userType: 'employee', category: 'Employee' },
  { title: 'Courier Management', path: '/employee/couriers', description: 'Manage courier accounts', icon: Truck, userType: 'employee', category: 'Employee' },
  { title: 'User Detail', path: '/employee/customers/1', description: 'View and edit user details', icon: User, userType: 'employee', category: 'Employee' },
  { title: 'Analytics', path: '/analytics', description: 'Platform statistics and data', icon: BarChart, userType: 'employee', category: 'Employee' },
  { title: 'API Playground', path: '/employee/api-playground', description: 'Test API endpoints directly', icon: Terminal, userType: 'employee', category: 'Employee' },
  { title: 'Component Library', path: '/employee/components', description: 'Browse and download UI components', icon: Layers, userType: 'employee', category: 'Employee' },
  { title: 'Sitemap', path: '/employee/sitemap', description: 'Navigation overview of all pages', icon: MapPin, userType: 'employee', category: 'Employee' },
  { title: 'Not Found', path: '/404', description: 'Error page for 404 routes', icon: AlertCircle, userType: 'all', category: 'System' },
];

const Sitemap = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  
  // Redirect if not logged in or not an employee
  if (!user) {
    return <Navigate to="/login" />;
  } else if (user.user_type !== 'employee') {
    return <Navigate to="/" />;
  }

  // Add a state parameter to the URL to indicate that the user is coming from the sitemap
  const handleVisitPage = (page: SitemapPage) => {
    // Show a toast notification when visiting a page that would normally be restricted
    if (page.userType !== 'all' && page.userType !== 'employee' && page.userType !== user.user_type) {
      toast({
        title: `Visiting as ${page.userType}`,
        description: `You're viewing this page as if you were a ${page.userType} user.`,
        duration: 5000,
      });
    }
  };

  const categories = Array.from(new Set(pages.map(page => page.category)));

  const getBadgeColor = (userType: string) => {
    switch (userType) {
      case 'all': return 'bg-gray-500 hover:bg-gray-600';
      case 'anonymous': return 'bg-blue-500 hover:bg-blue-600';
      case 'customer': return 'bg-green-500 hover:bg-green-600';
      case 'restaurant': return 'bg-orange-500 hover:bg-orange-600';
      case 'courier': return 'bg-purple-500 hover:bg-purple-600';
      case 'employee': return 'bg-red-500 hover:bg-red-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <NavBar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Site Map</h1>
            <p className="text-gray-500">
              Browse all pages of the application with user access levels
            </p>
          </div>
          <Badge className="bg-primary">Employee Portal</Badge>
        </div>
        
        <div className="flex flex-wrap gap-3 mb-6">
          <Badge className="bg-gray-500 hover:bg-gray-600">All Users</Badge>
          <Badge className="bg-blue-500 hover:bg-blue-600">Anonymous</Badge>
          <Badge className="bg-green-500 hover:bg-green-600">Customer</Badge>
          <Badge className="bg-orange-500 hover:bg-orange-600">Restaurant</Badge>
          <Badge className="bg-purple-500 hover:bg-purple-600">Courier</Badge>
          <Badge className="bg-red-500 hover:bg-red-600">Employee</Badge>
        </div>
        
        {categories.map((category) => (
          <div key={category} className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pages
                .filter(page => page.category === category)
                .map((page) => (
                  <Card key={page.path} className="overflow-hidden hover:shadow-md transition-shadow border-t-4" style={{ borderTopColor: getBadgeColor(page.userType).split(' ')[0].replace('bg-', '') }}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <page.icon className="h-5 w-5" />
                          {page.title}
                        </CardTitle>
                        <Badge className={getBadgeColor(page.userType)}>
                          {page.userType === 'all' ? 'All' : 
                            page.userType === 'anonymous' ? 'Anonymous' : 
                            page.userType.charAt(0).toUpperCase() + page.userType.slice(1)}
                        </Badge>
                      </div>
                      <CardDescription>{page.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 pb-2">
                      <p className="text-sm text-gray-500">Path: {page.path}</p>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <Button 
                        asChild 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => handleVisitPage(page)}
                      >
                        <Link to={page.path}>Visit Page</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
            </div>
            <Separator className="my-6" />
          </div>
        ))}
        
        <div className="my-8">
          <Card className="bg-gray-50 border-dashed">
            <CardHeader>
              <CardTitle>Sitemap Overview</CardTitle>
              <CardDescription>
                Visualize the application structure and navigation flow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full overflow-auto">
                <div className="min-w-[800px] p-4 bg-white rounded-lg border">
                  <div className="flex flex-col items-center">
                    <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg">
                      Home (/)
                    </div>
                    <div className="h-8 border-l-2"></div>
                    <div className="grid grid-cols-4 gap-8 w-full">
                      {/* Authentication */}
                      <div className="flex flex-col items-center">
                        <div className="bg-blue-500 text-white px-4 py-2 rounded-lg text-center">
                          Authentication
                        </div>
                        <div className="h-6 border-l-2"></div>
                        <div className="grid grid-cols-1 gap-4 w-full">
                          <div className="bg-blue-100 p-2 rounded text-center text-xs">Login</div>
                          <div className="bg-blue-100 p-2 rounded text-center text-xs">Register</div>
                        </div>
                      </div>
                      
                      {/* Customer */}
                      <div className="flex flex-col items-center">
                        <div className="bg-green-500 text-white px-4 py-2 rounded-lg text-center">
                          Customer
                        </div>
                        <div className="h-6 border-l-2"></div>
                        <div className="grid grid-cols-1 gap-4 w-full">
                          <div className="bg-green-100 p-2 rounded text-center text-xs">Restaurants</div>
                          <div className="bg-green-100 p-2 rounded text-center text-xs">Orders</div>
                          <div className="bg-green-100 p-2 rounded text-center text-xs">Profile</div>
                        </div>
                      </div>
                      
                      {/* Restaurant */}
                      <div className="flex flex-col items-center">
                        <div className="bg-orange-500 text-white px-4 py-2 rounded-lg text-center">
                          Restaurant
                        </div>
                        <div className="h-6 border-l-2"></div>
                        <div className="grid grid-cols-1 gap-4 w-full">
                          <div className="bg-orange-100 p-2 rounded text-center text-xs">Setup</div>
                          <div className="bg-orange-100 p-2 rounded text-center text-xs">Menu</div>
                          <div className="bg-orange-100 p-2 rounded text-center text-xs">Orders</div>
                          <div className="bg-orange-100 p-2 rounded text-center text-xs">Profile</div>
                        </div>
                      </div>
                      
                      {/* Employee */}
                      <div className="flex flex-col items-center">
                        <div className="bg-red-500 text-white px-4 py-2 rounded-lg text-center">
                          Employee
                        </div>
                        <div className="h-6 border-l-2"></div>
                        <div className="grid grid-cols-1 gap-4 w-full">
                          <div className="bg-red-100 p-2 rounded text-center text-xs">Dashboard</div>
                          <div className="bg-red-100 p-2 rounded text-center text-xs">Management</div>
                          <div className="bg-red-100 p-2 rounded text-center text-xs">Analytics</div>
                          <div className="bg-red-100 p-2 rounded text-center text-xs">Developer Tools</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Sitemap;
