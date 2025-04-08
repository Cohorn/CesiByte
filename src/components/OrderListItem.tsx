
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Order, OrderStatus } from '@/lib/database.types';
import OrderItemCard from '@/components/OrderItemCard';
import OrderStatusUpdate from '@/components/OrderStatusUpdate';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CourierReviewForm from '@/components/CourierReviewForm';
import { useToast } from '@/hooks/use-toast';
import { Clock } from 'lucide-react';
import { isStaleOrder } from '@/utils/orderUtils';

interface OrderListItemProps {
  order: Order;
  onUpdateStatus: (orderId: string, status: OrderStatus) => Promise<{ success: boolean, error?: any }>;
  isCurrentOrder?: boolean;
  restaurantName?: string;
  onReviewCourier?: (orderId: string, courierId: string, data: { rating: number; comment: string }) => void;
  canUpdateStatus?: boolean;
}

const OrderListItem: React.FC<OrderListItemProps> = ({ 
  order, 
  onUpdateStatus,
  isCurrentOrder = true,
  restaurantName,
  onReviewCourier,
  canUpdateStatus = false
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isCustomer = user?.id === order.user_id;
  const showDeliveryPin = isCustomer && ['ready_for_pickup', 'picked_up', 'on_the_way'].includes(order.status);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  
  // Updated condition: Check if order is completed or delivered and has a courier assigned
  const canReviewCourier = isCustomer && 
                          (order.status === 'completed' || order.status === 'delivered') && 
                          order.courier_id && 
                          onReviewCourier !== undefined;

  // Calculate time remaining before order becomes stale
  useEffect(() => {
    if (!isCurrentOrder || order.status === 'completed' || order.status === 'delivered') {
      return;
    }

    const calculateTimeRemaining = () => {
      const updatedAt = new Date(order.updated_at);
      const now = new Date();
      const diffInMinutes = (now.getTime() - updatedAt.getTime()) / (1000 * 60);
      const remainingMinutes = Math.max(0, 45 - diffInMinutes);
      
      if (remainingMinutes <= 0 && !isStaleOrder(order)) {
        // Refresh on timer expiration to update UI
        window.location.reload();
        return 0;
      }
      
      return remainingMinutes;
    };

    setTimeRemaining(calculateTimeRemaining());
    
    const timer = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);
      
      // Clear interval if order is about to expire
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 60000); // Update every minute
    
    return () => clearInterval(timer);
  }, [order, isCurrentOrder]);

  const handleReviewSubmit = (data: { rating: number; comment: string }) => {
    if (onReviewCourier && order.courier_id) {
      onReviewCourier(order.id, order.courier_id, data);
      setReviewDialogOpen(false);
      toast({
        title: "Review Submitted",
        description: "Thank you for reviewing your courier!"
      });
    }
  };

  // Format the time remaining in hours and minutes
  const formatTimeRemaining = (minutes: number): string => {
    if (minutes <= 0) return "Order will be auto-completed soon";
    
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    
    if (hours > 0) {
      return `${hours}h ${mins}m remaining`;
    } else {
      return `${mins} minutes remaining`;
    }
  };

  return (
    <div className="bg-white rounded shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Order #{order.id.substring(0, 8)}</h2>
        <span className="text-sm text-gray-600">
          {format(new Date(order.created_at), 'PPP p')}
        </span>
      </div>
      
      {/* Display restaurant name if available */}
      {restaurantName && (
        <div className="mb-2">
          <strong>Restaurant:</strong> {restaurantName}
        </div>
      )}
      
      <div className="mb-2">
        <strong>Delivery Address:</strong> {order.delivery_address}
      </div>
      
      <div className="mb-2">
        <strong>Status:</strong> <span className="capitalize">{order.status.replace(/_/g, ' ')}</span>
      </div>
      
      {/* Show countdown timer for active orders */}
      {isCurrentOrder && timeRemaining !== null && (
        <div className={`mb-2 p-2 rounded flex items-center gap-2 
          ${timeRemaining < 15 ? 'bg-red-50 text-red-800 border border-red-200' : 
            timeRemaining < 30 ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' : 
            'bg-blue-50 text-blue-800 border border-blue-200'}`}>
          <Clock className="h-4 w-4" />
          <span>{formatTimeRemaining(timeRemaining)}</span>
        </div>
      )}
      
      {/* Show delivery PIN only to customers for relevant order statuses */}
      {showDeliveryPin && (
        <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded">
          <strong>Delivery PIN:</strong> <span className="font-mono font-bold">{order.delivery_pin}</span>
          <p className="text-xs text-gray-600 mt-1">Share this PIN with your courier upon delivery</p>
        </div>
      )}
      
      <div>
        <strong>Items:</strong>
        <ul className="mt-2">
          {Array.isArray(order.items) && order.items.map((item, index) => (
            <li key={index} className="py-2">
              <OrderItemCard item={item} />
            </li>
          ))}
        </ul>
      </div>
      
      <div className="mt-4">
        <strong>Total:</strong> ${order.total_price?.toFixed(2)}
      </div>
      
      {isCurrentOrder && canUpdateStatus && (
        <OrderStatusUpdate 
          orderId={order.id}
          currentStatus={order.status}
          onStatusUpdate={onUpdateStatus}
        />
      )}
      
      {canReviewCourier && (
        <div className="mt-4">
          <Button 
            onClick={() => setReviewDialogOpen(true)}
            variant="outline"
            className="w-full"
          >
            Review Courier
          </Button>
          
          <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Review Your Courier</DialogTitle>
              </DialogHeader>
              <CourierReviewForm 
                courierId={order.courier_id as string}
                orderId={order.id}
                onSubmit={handleReviewSubmit}
              />
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
};

export default OrderListItem;
