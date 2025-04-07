
import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/hooks/use-toast';
import NavBar from '@/components/NavBar';
import { userApi } from '@/api/services/userService';
import { User } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, Trash, UserCog, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const RestaurantManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  // Redirect if not logged in or not an employee
  if (!user) {
    return <Navigate to="/employee/login" />;
  } else if (user.user_type !== 'employee') {
    return <Navigate to="/employee/dashboard" />;
  }

  // Fetch all restaurants
  const { data: restaurants, isLoading, error, refetch } = useQuery({
    queryKey: ['restaurant-users'],
    queryFn: async () => {
      const response = await userApi.getUsersByType('restaurant');
      return response;
    }
  });

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this restaurant? This action cannot be undone.')) {
      setIsDeleting(userId);
      try {
        await userApi.deleteUser(userId);
        toast({
          title: "Restaurant Deleted",
          description: "The restaurant account has been successfully deleted."
        });
        refetch();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete the restaurant.",
          variant: "destructive"
        });
      } finally {
        setIsDeleting(null);
      }
    }
  };

  // Filter restaurants based on search term
  const filteredRestaurants = restaurants?.filter((restaurant: User) => 
    restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <NavBar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link to="/employee/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Restaurant Management</h1>
          <p className="text-gray-500">Manage restaurant accounts</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Restaurants</CardTitle>
            <CardDescription>
              View and manage all restaurant accounts
            </CardDescription>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search restaurants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">
                Failed to load restaurants. Please try again.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRestaurants?.length ? (
                      filteredRestaurants.map((restaurant: User) => (
                        <TableRow key={restaurant.id}>
                          <TableCell>{restaurant.name}</TableCell>
                          <TableCell>{restaurant.email}</TableCell>
                          <TableCell>{restaurant.address}</TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                asChild
                              >
                                <Link to={`/employee/restaurants/${restaurant.id}`}>
                                  <UserCog className="h-4 w-4" />
                                  <span className="sr-only">Edit</span>
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteUser(restaurant.id)}
                                disabled={isDeleting === restaurant.id}
                              >
                                {isDeleting === restaurant.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash className="h-4 w-4 text-red-500" />
                                )}
                                <span className="sr-only">Delete</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                          {searchTerm ? "No restaurants found matching your search." : "No restaurants found."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RestaurantManagement;
