
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
import { 
  ArrowLeft, Search, Trash, UserCog, Loader2, MapPin, 
  Calendar, Mail, Star, Package, Activity
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { orderApi } from '@/api/services/orderService';
import { orderStatus } from '@/lib/utils';

const CourierManagement = () => {
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

  // Fetch all couriers
  const { data: couriers, isLoading, error, refetch } = useQuery({
    queryKey: ['courier-users'],
    queryFn: async () => {
      const response = await userApi.getUsersByType('courier');
      return response;
    }
  });

  // Get active orders for couriers to show activity status
  const { data: activeOrders } = useQuery({
    queryKey: ['active-courier-orders'],
    queryFn: async () => {
      // Get all active delivery statuses (picked_up, on_the_way)
      const statuses = ['picked_up', 'on_the_way', 'ready_for_pickup'];
      return await orderApi.getOrdersByStatus(statuses);
    },
    enabled: !isLoading && !!couriers
  });

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this courier? This action cannot be undone.')) {
      setIsDeleting(userId);
      try {
        await userApi.deleteUser(userId);
        toast({
          title: "Courier Deleted",
          description: "The courier account has been successfully deleted."
        });
        refetch();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete the courier.",
          variant: "destructive"
        });
      } finally {
        setIsDeleting(null);
      }
    }
  };

  // Filter couriers based on search term
  const filteredCouriers = couriers?.filter((courier: User) => 
    courier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    courier.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    courier.address.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-2xl font-bold">Courier Management</h1>
          <p className="text-gray-500">Manage courier accounts and track active deliveries</p>
        </div>
        
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Couriers</CardTitle>
                <CardDescription>
                  View and manage all courier accounts
                </CardDescription>
              </div>
              {!isLoading && filteredCouriers && (
                <Badge variant="outline" className="ml-2">
                  {filteredCouriers.length} {filteredCouriers.length === 1 ? 'courier' : 'couriers'}
                </Badge>
              )}
            </div>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search couriers..."
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
                Failed to load couriers. Please try again.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCouriers?.length ? (
                      filteredCouriers.map((courier: User) => {
                        // Find any active orders for this courier
                        const courierActiveOrders = activeOrders?.filter(
                          order => order.courier_id === courier.id
                        ) || [];
                        
                        const isActive = courierActiveOrders.length > 0;
                        const activeStatus = isActive 
                          ? courierActiveOrders[0].status
                          : null;

                        return (
                          <TableRow key={courier.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center">
                                <Package className="h-3 w-3 mr-1 text-gray-400" />
                                {courier.name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Mail className="h-3 w-3 mr-1 text-gray-400" />
                                {courier.email}
                              </div>
                            </TableCell>
                            <TableCell>
                              {isActive ? (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                                  <Activity className="h-3 w-3 mr-1" />
                                  {orderStatus(activeStatus || '')}
                                  {courierActiveOrders.length > 1 && 
                                    ` (+${courierActiveOrders.length - 1} more)`}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-gray-500">
                                  Inactive
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="flex items-center">
                              <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                              {`${courier.lat.toFixed(4)}, ${courier.lng.toFixed(4)}`}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                                {formatDistanceToNow(new Date(courier.created_at), { addSuffix: true })}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  asChild
                                >
                                  <Link to={`/employee/couriers/${courier.id}`}>
                                    <UserCog className="h-4 w-4" />
                                    <span className="sr-only">Edit</span>
                                  </Link>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteUser(courier.id)}
                                  disabled={isDeleting === courier.id}
                                >
                                  {isDeleting === courier.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash className="h-4 w-4 text-red-500" />
                                  )}
                                  <span className="sr-only">Delete</span>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          {searchTerm ? "No couriers found matching your search." : "No couriers found."}
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

export default CourierManagement;
