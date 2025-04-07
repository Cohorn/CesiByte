
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Check, X, Clock } from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import { OrderStatus } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';
import { notificationService } from '@/api/services/notificationService';

interface OrderStatusUpdateProps {
  orderId: string;
  currentStatus: OrderStatus;
  restaurantId?: string;
  courierId?: string;
  userId?: string;
  className?: string;
}

const OrderStatusUpdate: React.FC<OrderStatusUpdateProps> = ({ 
  orderId, 
  currentStatus,
  restaurantId,
  courierId,
  userId,
  className
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { updateOrderStatus } = useOrders();
  const { user } = useAuth();
  const { toast } = useToast();

  // Define the status flow based on user type
  // This determines what status options are available for each user type
  const restaurantStatusFlow = {
    pending: ['accepted_by_restaurant', 'cancelled'],
    accepted_by_restaurant: ['preparing', 'cancelled'],
    preparing: ['ready_for_pickup', 'cancelled'],
    ready_for_pickup: ['picked_up', 'cancelled'],
    // Restaurant can't update beyond this point
  };

  const courierStatusFlow = {
    picked_up: ['in_delivery', 'cancelled'],
    in_delivery: ['delivered', 'cancelled']
  };

  // Get the next possible statuses based on user type and current status
  const getNextStatuses = (): OrderStatus[] => {
    if (user?.user_type === 'restaurant') {
      return restaurantStatusFlow[currentStatus as keyof typeof restaurantStatusFlow] || [];
    } else if (user?.user_type === 'courier') {
      return courierStatusFlow[currentStatus as keyof typeof courierStatusFlow] || [];
    }
    return [];
  };

  // Check if the current user can update the status
  const canUpdateStatus = (): boolean => {
    if (user?.user_type === 'employee') {
      return true; // Employees can update any order status
    }

    if (user?.user_type === 'restaurant' && user.id === restaurantId) {
      // Restaurant can only update their own orders and only within the restaurant flow
      return !!restaurantStatusFlow[currentStatus as keyof typeof restaurantStatusFlow];
    }

    if (user?.user_type === 'courier' && user.id === courierId) {
      // Courier can only update their assigned orders and only within the courier flow
      return !!courierStatusFlow[currentStatus as keyof typeof courierStatusFlow];
    }

    return false;
  };

  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    if (!canUpdateStatus()) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to update this order's status",
        variant: "destructive"
      });
      return;
    }

    setIsUpdating(true);
    
    try {
      const oldStatus = currentStatus;
      const result = await updateOrderStatus(orderId, newStatus);
      
      if (result && result.success) {
        toast({
          title: "Status updated",
          description: `Order status updated to ${newStatus.replace(/_/g, ' ')}`,
        });
        
        // Send notifications
        // 1. Notify user about order status change
        if (userId) {
          notificationService.notifyOrderStatusUpdate(
            { id: orderId, user_id: userId, status: newStatus, restaurant_id: restaurantId },
            oldStatus
          );
        }
        
        // 2. If status is ready_for_pickup, notify couriers
        if (newStatus === 'ready_for_pickup') {
          notificationService.notifyOrderAvailableForPickup(
            { id: orderId, status: newStatus, restaurant_id: restaurantId }
          );
        }
      } else {
        toast({
          title: "Update failed",
          description: "Failed to update order status",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      toast({
        title: "Error",
        description: "An error occurred while updating the status",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!canUpdateStatus()) {
    return null;
  }

  const nextStatuses = getNextStatuses();
  
  if (nextStatuses.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-2 mt-2", className)}>
      {isUpdating ? (
        <div className="flex items-center text-muted-foreground text-sm">
          <Clock className="h-4 w-4 mr-1 animate-spin" />
          Updating...
        </div>
      ) : (
        <>
          <span className="text-sm text-muted-foreground self-center mr-1">Update status:</span>
          {nextStatuses.map((status) => (
            <Button
              key={status}
              variant={status === 'cancelled' ? "destructive" : "outline"}
              size="sm"
              onClick={() => handleStatusUpdate(status)}
              className="text-xs"
            >
              {status === 'cancelled' ? (
                <X className="h-3 w-3 mr-1" />
              ) : (
                <Check className="h-3 w-3 mr-1" />
              )}
              {status.replace(/_/g, ' ')}
            </Button>
          ))}
        </>
      )}
    </div>
  );
};

export default OrderStatusUpdate;
