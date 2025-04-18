
import React, { useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth, isEmployeeType, isDeveloper, isCommercialAgent } from '@/lib/AuthContext';
import NavBar from '@/components/NavBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, BarChart, Code, 
  Store, Truck, 
  Layers, Terminal, MapPin,
  ClipboardList
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  useEffect(() => {
    if (user) {
      console.log("EmployeeDashboard - Current user:", user);
      console.log("Is employee type:", isEmployeeType(user));
      console.log("Is developer:", isDeveloper(user));
      console.log("Is commercial agent:", isCommercialAgent(user));
    }
  }, [user]);
  
  // Redirect if not logged in
  if (!user) {
    console.log("No user found, redirecting to login");
    return <Navigate to="/employee/login" />;
  } 
  
  // Redirect non-employee users
  if (!isEmployeeType(user)) {
    console.log("User is not an employee, redirecting to home");
    toast({
      title: "Access Denied",
      description: "This section is only accessible to employees",
      variant: "destructive"
    });
    return <Navigate to="/" />;
  }

  // Check specific role permissions
  const canAccessDeveloperTools = isDeveloper(user);
  const canAccessCommercialTools = isCommercialAgent(user);

  // Determine role display name
  const roleDisplayName = isDeveloper(user) ? 'Developer' : 
                          isCommercialAgent(user) ? 'Commercial Agent' : 
                          'Employee';

  console.log("Showing dashboard for:", roleDisplayName);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <NavBar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Employee Dashboard</h1>
            <p className="text-gray-500">
              Welcome, {user.name} | {roleDisplayName}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Order Management - Available to all employees */}
          <Card className="hover:shadow-md transition-shadow border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle className="flex items-center">
                <ClipboardList className="h-5 w-5 mr-2" />
                Order Management
              </CardTitle>
              <CardDescription>
                View and manage all orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/employee/orders">Manage Orders</Link>
              </Button>
            </CardContent>
          </Card>
          
          {/* Sitemap - Available to all employees */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Sitemap
              </CardTitle>
              <CardDescription>
                Browse all pages with access levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/employee/sitemap">View Sitemap</Link>
              </Button>
            </CardContent>
          </Card>
          
          {/* Analytics - Available to all employees */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart className="h-5 w-5 mr-2" />
                Analytics Dashboard
              </CardTitle>
              <CardDescription>
                View platform statistics and data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/analytics">View Analytics</Link>
              </Button>
            </CardContent>
          </Card>
          
          {/* User Management - Available to commercial agents */}
          {canAccessCommercialTools && (
            <>
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Customer Management
                  </CardTitle>
                  <CardDescription>
                    Manage customer accounts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link to="/employee/customers">Manage Customers</Link>
                  </Button>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Store className="h-5 w-5 mr-2" />
                    Restaurant Management
                  </CardTitle>
                  <CardDescription>
                    Manage restaurant accounts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link to="/employee/restaurants">Manage Restaurants</Link>
                  </Button>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Truck className="h-5 w-5 mr-2" />
                    Courier Management
                  </CardTitle>
                  <CardDescription>
                    Manage courier accounts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link to="/employee/couriers">Manage Couriers</Link>
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
          
          {/* Developer Tools - Available only to developers */}
          {canAccessDeveloperTools && (
            <>
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Terminal className="h-5 w-5 mr-2" />
                    API Playground
                  </CardTitle>
                  <CardDescription>
                    Test API endpoints directly
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link to="/employee/api-playground">API Playground</Link>
                  </Button>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Layers className="h-5 w-5 mr-2" />
                    Component Library
                  </CardTitle>
                  <CardDescription>
                    Browse and download UI components
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link to="/employee/component-library">Component Library</Link>
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
