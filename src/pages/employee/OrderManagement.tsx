
import React, { useState, useEffect } from 'react';
import { orderApi } from '@/api/services/orderService';
import { Order, OrderStatus } from '@/lib/database.types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ORDER_STATUS_DISPLAY } from '@/utils/orderUtils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  Calendar, 
  Edit, 
  Eye, 
  Filter, 
  RefreshCw, 
  Search, 
  Truck, 
  User, 
  X
} from 'lucide-react';
import OrderListItem from '@/components/OrderListItem';
import { formatEstimatedDeliveryTime } from '@/utils/deliveryTimeUtils';

const OrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderStatus>('created');
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all orders from the API
      const response = await orderApi.getOrdersByStatus('all' as any);
      setOrders(response);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setError(err.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchOrders();
      toast({
        title: 'Orders refreshed',
        description: 'The order list has been updated',
      });
    } catch (err) {
      console.error('Error refreshing orders:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, status: OrderStatus) => {
    try {
      await orderApi.updateOrderStatus(orderId, status);
      
      // Update the local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status } : order
        )
      );
      
      setEditDialogOpen(false);
      toast({
        title: 'Status updated',
        description: `Order status changed to ${ORDER_STATUS_DISPLAY[status]}`,
      });
      
      return { success: true };
    } catch (err: any) {
      console.error('Error updating order status:', err);
      toast({
        title: 'Update failed',
        description: err.message || 'Failed to update order status',
        variant: 'destructive',
      });
      return { success: false, error: err };
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (status: string) => {
    setStatusFilter(status as OrderStatus | 'all');
  };

  const openViewDialog = (order: Order) => {
    setSelectedOrder(order);
    setViewDialogOpen(true);
  };

  const openEditDialog = (order: Order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setEditDialogOpen(true);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.restaurant_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.courier_id && order.courier_id.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Group orders by status for the tabs view
  const activeOrders = filteredOrders.filter(order => 
    ['created', 'accepted_by_restaurant', 'preparing', 'ready_for_pickup', 'picked_up', 'on_the_way'].includes(order.status)
  );
  
  const completedOrders = filteredOrders.filter(order => 
    ['delivered', 'completed'].includes(order.status)
  );
  
  const cancelledOrders = filteredOrders.filter(order => 
    order.status === 'cancelled'
  );

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Order Management</h1>
        <Button 
          onClick={handleRefresh}
          variant="outline"
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order ID, user, restaurant..."
                value={searchTerm}
                onChange={handleSearch}
                className="pl-8"
              />
            </div>
            <div className="w-full sm:w-64">
              <Select 
                value={statusFilter} 
                onValueChange={handleFilterChange}
              >
                <SelectTrigger>
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.entries(ORDER_STATUS_DISPLAY).map(([status, label]) => (
                    <SelectItem key={status} value={status}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
          <p className="mt-2 text-gray-500">Loading orders...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
          <h3 className="text-lg font-semibold">Error</h3>
          <p>{error}</p>
          <Button 
            onClick={fetchOrders} 
            variant="outline" 
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="active">
          <TabsList className="mb-4">
            <TabsTrigger value="active">
              Active ({activeOrders.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedOrders.length})
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              Cancelled ({cancelledOrders.length})
            </TabsTrigger>
            <TabsTrigger value="all">
              All Orders ({filteredOrders.length})
            </TabsTrigger>
          </TabsList>
          
          {['active', 'completed', 'cancelled', 'all'].map((tab) => {
            const tabOrders = 
              tab === 'active' ? activeOrders :
              tab === 'completed' ? completedOrders :
              tab === 'cancelled' ? cancelledOrders :
              filteredOrders;
              
            return (
              <TabsContent key={tab} value={tab} className="space-y-4">
                {tabOrders.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-md">
                    <p className="text-gray-500">No orders found</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-md shadow overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Restaurant</TableHead>
                          <TableHead>Courier</TableHead>
                          <TableHead>Est. Delivery</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tabOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">
                              {order.id.substring(0, 8)}...
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                order.status === 'completed' ? 'outline' :
                                order.status === 'delivered' ? 'secondary' :
                                order.status === 'cancelled' ? 'destructive' :
                                ['picked_up', 'on_the_way'].includes(order.status) ? 'default' :
                                'secondary'
                              }>
                                {ORDER_STATUS_DISPLAY[order.status]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {format(new Date(order.created_at), 'PP')}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <User className="h-4 w-4 mr-1 text-gray-400" />
                                <span>{order.user_id.substring(0, 6)}...</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {order.restaurant_id.substring(0, 6)}...
                            </TableCell>
                            <TableCell>
                              {order.courier_id ? (
                                <div className="flex items-center">
                                  <Truck className="h-4 w-4 mr-1 text-gray-400" />
                                  <span>{order.courier_id.substring(0, 6)}...</span>
                                </div>
                              ) : (
                                <span className="text-gray-400">Not assigned</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {order.estimated_delivery_time ? (
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                                  <span>{formatEstimatedDeliveryTime(order.estimated_delivery_time)}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400">Not set</span>
                              )}
                            </TableCell>
                            <TableCell>${order.total_price.toFixed(2)}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  onClick={() => openViewDialog(order)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="icon"
                                  onClick={() => openEditDialog(order)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      {/* View Order Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-4 top-4" 
              onClick={() => setViewDialogOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          <ScrollArea className="max-h-[80vh]">
            {selectedOrder && (
              <OrderListItem 
                order={selectedOrder} 
                onUpdateStatus={handleStatusUpdate}
                isCurrentOrder={false}
                canUpdateStatus={true}
              />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Edit Order Status Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-1">Current Status</h3>
                <Badge>
                  {ORDER_STATUS_DISPLAY[selectedOrder.status]}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <label className="font-medium">New Status</label>
                <Select value={newStatus} onValueChange={(value) => setNewStatus(value as OrderStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ORDER_STATUS_DISPLAY).map(([status, label]) => (
                      <SelectItem key={status} value={status}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleStatusUpdate(selectedOrder.id, newStatus)}
                >
                  Update Status
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderManagement;
