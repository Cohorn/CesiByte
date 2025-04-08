
import React, { useState } from 'react';
import { format } from 'date-fns';
import { Order, OrderStatus } from '@/lib/database.types';
import OrderItemCard from '@/components/OrderItemCard';
import OrderStatusUpdate from '@/components/OrderStatusUpdate';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CourierReviewForm from '@/components/CourierReviewForm';

interface OrderListItemProps {
  order: Order;
  onUpdateStatus: (orderId: string, status: OrderStatus) => Promise<{ success: boolean, error?: any }>;
  isCurrentOrder?: boolean;
  restaurantName?: string;
  onReviewCourier?: (orderId: string, courierId: string) => void;
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
  const isCustomer = user?.id === order.user_id;
  const showDeliveryPin = isCustomer && ['ready_for_pickup', 'picked_up', 'on_the_way'].includes(order.status);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  
  // Check if order is completed and has a courier assigned
  const canReviewCourier = isCustomer && 
                          order.status === 'completed' && 
                          order.courier_id && 
                          onReviewCourier;

  const handleReviewSubmit = (data: { rating: number; comment: string }) => {
    if (onReviewCourier && order.courier_id) {
      onReviewCourier(order.id, order.courier_id);
    }
    setReviewDialogOpen(false);
  };

  // Debug log to check why the review button might not be showing
  console.log(`Order ${order.id} review conditions:`, {
    isCustomer,
    status: order.status,
    hasCourierId: !!order.courier_id,
    hasReviewCallback: !!onReviewCourier,
    canReviewCourier
  });

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
