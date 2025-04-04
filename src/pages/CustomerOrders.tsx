
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import NavBar from '@/components/NavBar';
import { Order, Restaurant, OrderStatus, SimpleUser, OrderItem } from '@/lib/database.types';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import CourierReviewForm from '@/components/CourierReviewForm';
import { useReviews } from '@/hooks/useReviews';
import { useOrders } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { CheckCircle, MapPin } from 'lucide-react';
import { calculateDistance, formatDistance } from '@/lib/distanceUtils';

interface OrderWithRestaurant extends Order {
  restaurant: Restaurant;
}

const CustomerOrders = () => {
  const { user } = useAuth();
  const [activeOrders, setActiveOrders] = useState<OrderWithRestaurant[]>([]);
  const [pastOrders, setPastOrders] = useState<OrderWithRestaurant[]>([]);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [courierUsers, setCourierUsers] = useState<SimpleUser[]>([]);
  const { toast } = useToast();
  const { submitReview } = useReviews();
  const { updateOrderStatus } = useOrders();

  // Define which statuses are considered "active" vs "past"
  const activeStatuses: OrderStatus[] = [
    'created', 
    'accepted_by_restaurant', 
    'preparing', 
    'ready_for_pickup', 
    'picked_up', 
    'on_the_way', 
    'delivered'
  ];
  const pastStatuses: OrderStatus[] = ['completed'];

  useEffect(() => {
    if (!user) {
      return;
    }

    const fetchOrders = async () => {
      try {
        // Fetch orders with restaurant data
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select(`
            *,
            restaurants (*)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (ordersError) {
          console.error('Error fetching orders:', ordersError);
          toast({
            title: "Error",
            description: "Failed to load orders",
            variant: "destructive",
          });
          return;
        }

        // Fetch courier users
        const courierIds = ordersData
          ?.map(order => order.courier_id)
          .filter(Boolean) as string[];
        
        if (courierIds && courierIds.length > 0) {
          const { data: couriersData, error: couriersError } = await supabase
            .from('users')
            .select('id, name, lat, lng')
            .in('id', courierIds);
          
          if (couriersError) {
            console.error('Error fetching couriers:', couriersError);
          } else {
            setCourierUsers(couriersData as SimpleUser[]);
          }
        }

        if (ordersData) {
          const ordersWithRestaurants = ordersData.map(order => {
            // Parse items if it's a string
            const parsedItems = typeof order.items === 'string' 
              ? JSON.parse(order.items) 
              : (Array.isArray(order.items) ? order.items : []);
            
            return {
              ...order,
              items: parsedItems as OrderItem[],
              restaurant: order.restaurants as Restaurant,
              status: order.status as OrderStatus
            } as OrderWithRestaurant;
          });
          
          // Separate active and past orders
          const active = ordersWithRestaurants.filter(order => 
            activeStatuses.includes(order.status)
          );
          
          const past = ordersWithRestaurants.filter(order => 
            pastStatuses.includes(order.status)
          );
          
          setActiveOrders(active);
          setPastOrders(past);
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive",
        });
      }
    };

    fetchOrders();
  }, [user, toast, activeStatuses, pastStatuses]);

  const handleReviewCourier = (order: Order) => {
    setSelectedOrder(order);
    setShowReviewDialog(true);
  };

  const handleSubmitReview = async (data: { rating: number; comment: string }) => {
    if (!user || !selectedOrder || !selectedOrder.courier_id) return;

    const reviewData = {
      user_id: user.id,
      courier_id: selectedOrder.courier_id,
      rating: data.rating,
      comment: data.comment || ''
    };

    const result = await submitReview(reviewData);

    if (result.success) {
      setShowReviewDialog(false);
      toast({
        title: "Success",
        description: "Review submitted successfully",
      });
    }
  };

  const handleConfirmDelivery = async (orderId: string) => {
    const result = await updateOrderStatus(orderId, 'completed');
    if (result.success) {
      // Move the order from active to past
      const confirmedOrder = activeOrders.find(order => order.id === orderId);
      if (confirmedOrder) {
        const updatedOrder = { ...confirmedOrder, status: 'completed' as OrderStatus };
        setActiveOrders(prev => prev.filter(order => order.id !== orderId));
        setPastOrders(prev => [updatedOrder, ...prev]);
        
        toast({
          title: "Order Confirmed",
          description: "Your order has been marked as completed",
        });
      }
    }
  };

  const getCourierInfo = (courierId: string | null) => {
    if (!courierId) return { name: 'Not assigned', distance: 0 };
    const courier = courierUsers.find(c => c.id === courierId);
    return {
      name: courier ? courier.name : 'Unknown courier',
      lat: courier?.lat,
      lng: courier?.lng
    };
  };

  // Redirect if user is not logged in
  if (!user) {
    return <Navigate to="/login" />;
  }

  // Render an order card for both active and past orders
  const renderOrderCard = (order: OrderWithRestaurant, isActive: boolean) => {
    const courierInfo = getCourierInfo(order.courier_id);
    
    // Calculate restaurant distance
    const restaurantDistance = calculateDistance(
      user.lat,
      user.lng,
      order.restaurant.lat,
      order.restaurant.lng
    );
    
    // Calculate courier distance if available and only for active orders
    const courierDistance = isActive && courierInfo.lat && courierInfo.lng ? 
      calculateDistance(user.lat, user.lng, courierInfo.lat, courierInfo.lng) : 0;
    
    return (
      <div key={order.id} className="border p-4 rounded shadow-sm bg-white mb-4">
        <h2 className="text-lg font-bold">{order.restaurant.name}</h2>
        <div className="flex items-center text-sm text-blue-600 mt-1">
          <MapPin className="h-4 w-4 mr-1" />
          <span>{formatDistance(restaurantDistance)} from you</span>
        </div>
        
        <div className="mt-3 space-y-1">
          <p className="text-gray-600">Status: <span className="font-medium">{order.status}</span></p>
          <p className="text-gray-600">
            Courier: <span className="font-medium">{courierInfo.name}</span>
            {isActive && courierDistance > 0 && (
              <span className="ml-2 text-sm text-blue-600">
                ({formatDistance(courierDistance)} from you)
              </span>
            )}
          </p>
          <p className="text-gray-600">
            Total: <span className="font-medium">${order.total_price.toFixed(2)}</span>
          </p>
          <p className="text-sm text-gray-500">
            {formatDistanceToNow(new Date(order.created_at), {
              addSuffix: true,
            })}
          </p>
        </div>
        
        <div className="mt-3 flex gap-2">
          {isActive && order.status === 'delivered' && (
            <Button
              size="sm"
              onClick={() => handleConfirmDelivery(order.id)}
              className="text-white bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Confirm Received
            </Button>
          )}
          
          {(!isActive || order.status === 'delivered') && order.courier_id && (
            <Button
              variant="outline" 
              size="sm"
              onClick={() => handleReviewCourier(order)}
            >
              Review Courier
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <NavBar />

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Your Orders</h1>

        <Tabs defaultValue="active" className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="active" className="flex-1">
              Active Orders ({activeOrders.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="flex-1">
              Past Orders ({pastOrders.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="active">
            {activeOrders.length > 0 ? (
              <div className="space-y-4">
                {activeOrders.map(order => renderOrderCard(order, true))}
              </div>
            ) : (
              <p className="text-center py-8 text-gray-500">No active orders found.</p>
            )}
          </TabsContent>
          
          <TabsContent value="past">
            {pastOrders.length > 0 ? (
              <div className="space-y-4">
                {pastOrders.map(order => renderOrderCard(order, false))}
              </div>
            ) : (
              <p className="text-center py-8 text-gray-500">No past orders found.</p>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Courier</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <CourierReviewForm
              courierId={selectedOrder.courier_id || ''}
              orderId={selectedOrder.id}
              onSubmit={handleSubmitReview}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerOrders;
