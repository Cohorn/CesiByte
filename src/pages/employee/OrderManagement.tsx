
import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/hooks/use-toast';
import NavBar from '@/components/NavBar';
import { Order, OrderStatus } from '@/lib/database.types';
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
  ArrowLeft, Search, Trash, Edit, 
  ClipboardCheck, AlertTriangle, Loader2 
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { orderApi } from '@/api/services/orderService';

// Function to get badge variant based on order status
const getStatusBadgeVariant = (status: OrderStatus) => {
  switch (status) {
    case 'created':
      return 'default';
    case 'accepted_by_restaurant':
    case 'preparing':
      return 'secondary';
    case 'ready_for_pickup':
    case 'picked_up':
    case 'on_the_way':
      return 'primary';
    case 'delivered':
    case 'completed':
      return 'success';
    case 'cancelled':
      return 'destructive';
    default:
      return 'outline';
  }
};

const OrderManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderStatus>('created');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  
  // Redirect if not logged in or not an employee
  if (!user) {
    return <Navigate to="/employee/login" />;
  } else if (user.user_type !== 'employee') {
    return <Navigate to="/" />;
  }

  // Fetch all orders
  const { data: orders, isLoading, error, refetch } = useQuery({
    queryKey: ['all-orders'],
    queryFn: async () => {
      // This assumes all orders can be fetched - you might need a specific API endpoint for employees
      const allStatuses: OrderStatus[] = ['created', 'accepted_by_restaurant', 'preparing', 'ready_for_pickup', 'picked_up', 'on_the_way', 'delivered', 'completed', 'cancelled'];
      const allOrders = await Promise.all(
        allStatuses.map(status => orderApi.getOrdersByStatus(status))
      );
      return allOrders.flat();
    }
  });

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !newStatus) return;
    
    setIsUpdating(selectedOrder.id);
    try {
      await orderApi.updateOrderStatus(selectedOrder.id, newStatus);
      toast({
        title: "Status Updated",
        description: `Order #${selectedOrder.id.substring(0, 8)} status has been updated to ${newStatus.replace(/_/g, ' ')}.`
      });
      refetch();
      setIsStatusDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update the order status.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (window.confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
      setIsDeleting(orderId);
      try {
        await orderApi.updateOrderStatus(orderId, 'cancelled');
        toast({
          title: "Order Cancelled",
          description: "The order has been cancelled successfully."
        });
        refetch();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to cancel the order.",
          variant: "destructive"
        });
      } finally {
        setIsDeleting(null);
      }
    }
  };

  // Filter orders based on search term and status
  const filteredOrders = orders?.filter((order: Order) => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.delivery_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.restaurant_id.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const openStatusDialog = (order: Order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setIsStatusDialogOpen(true);
  };

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
          <h1 className="text-2xl font-bold">Order Management</h1>
          <p className="text-gray-500">View and manage all orders in the system</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
            <CardDescription>
              Filter and manage all customer orders
            </CardDescription>
            <div className="flex flex-col md:flex-row gap-4 mt-4">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as OrderStatus | 'all')}
              >
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="accepted_by_restaurant">Accepted</SelectItem>
                  <SelectItem value="preparing">Preparing</SelectItem>
                  <SelectItem value="ready_for_pickup">Ready for Pickup</SelectItem>
                  <SelectItem value="picked_up">Picked Up</SelectItem>
                  <SelectItem value="on_the_way">On the Way</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                <p>Failed to load orders. Please try again.</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Restaurant</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders?.length ? (
                      filteredOrders.map((order: Order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono">{order.id.substring(0, 8)}</TableCell>
                          <TableCell>{format(new Date(order.created_at), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(order.status)}>
                              {order.status.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>{order.user_id.substring(0, 8)}</TableCell>
                          <TableCell>{order.restaurant_id.substring(0, 8)}</TableCell>
                          <TableCell>${order.total_price.toFixed(2)}</TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openStatusDialog(order)}
                                disabled={isUpdating === order.id}
                              >
                                {isUpdating === order.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Edit className="h-4 w-4 text-blue-500" />
                                )}
                                <span className="sr-only">Edit</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteOrder(order.id)}
                                disabled={isDeleting === order.id || order.status === 'cancelled'}
                              >
                                {isDeleting === order.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash className="h-4 w-4 text-red-500" />
                                )}
                                <span className="sr-only">Cancel</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          {searchTerm || statusFilter !== 'all' ? "No orders found matching your search." : "No orders found."}
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

      {/* Status Update Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">
              Order ID: <span className="font-mono">{selectedOrder?.id.substring(0, 8)}</span>
            </label>
            <label className="text-sm font-medium mb-2 block">New Status:</label>
            <Select
              value={newStatus}
              onValueChange={(value) => setNewStatus(value as OrderStatus)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created">Created</SelectItem>
                <SelectItem value="accepted_by_restaurant">Accepted by Restaurant</SelectItem>
                <SelectItem value="preparing">Preparing</SelectItem>
                <SelectItem value="ready_for_pickup">Ready for Pickup</SelectItem>
                <SelectItem value="picked_up">Picked Up</SelectItem>
                <SelectItem value="on_the_way">On the Way</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateStatus}
              disabled={isUpdating === selectedOrder?.id}
            >
              {isUpdating === selectedOrder?.id ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                <>
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  Update Status
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderManagement;
