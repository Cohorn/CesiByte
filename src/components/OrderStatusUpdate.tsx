
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { OrderStatus } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle } from 'lucide-react';
import { useOrderMQTT } from '@/hooks/useMQTT';
import { getEffectiveOrderStatus } from '@/utils/orderTimeUtils';
import { useAuth } from '@/lib/AuthContext';
import { orderMQTTService } from '@/api/services/orderMQTT';

interface OrderStatusUpdateProps {
  orderId: string;
  currentStatus: OrderStatus;
  onStatusUpdate: (orderId: string, status: OrderStatus) => Promise<{ success: boolean }>;
  showOnlyNextStatus?: boolean;
  restaurantId?: string; // Add restaurantId as an optional prop
}

// Order status progression for restaurants
const restaurantStatusFlow: OrderStatus[] = [
  'created',
  'accepted_by_restaurant',
  'preparing',
  'ready_for_pickup'
];

// Order status progression for couriers
const courierStatusFlow: OrderStatus[] = [
  'ready_for_pickup',
  'picked_up',
  'on_the_way',
  'delivered'
];

// Get the next logical status in the workflow
const getNextStatus = (currentStatus: OrderStatus, userType: string): OrderStatus | null => {
  // Use the appropriate status flow based on user type
  const statusFlow = userType === 'restaurant' ? restaurantStatusFlow : courierStatusFlow;
  
  const currentIndex = statusFlow.indexOf(currentStatus);
  if (currentIndex === -1 || currentIndex === statusFlow.length - 1) {
    return null;
  }
  return statusFlow[currentIndex + 1];
};

// Check if the status is a "current" order status
export const isCurrentOrder = (status: OrderStatus): boolean => {
  return status !== 'completed' && status !== 'delivered' && status !== 'canceled';
};

// Check if the user has permission to update the status
const hasUpdatePermission = (
  userType: string | undefined, 
  userId: string | undefined,
  restaurantUserId: string | undefined,
  currentStatus: OrderStatus,
  newStatus: OrderStatus
): boolean => {
  // Restaurant users can only update certain statuses
  if (userType === 'restaurant') {
    // Restaurant owner must match the restaurant user ID
    if (userId !== restaurantUserId) {
      return false;
    }
    
    // Restaurant can only update from 'created' to 'accepted_by_restaurant'
    // or from 'accepted_by_restaurant' to 'preparing'
    // or from 'preparing' to 'ready_for_pickup'
    const allowedTransitions = {
      'created': ['accepted_by_restaurant'],
      'accepted_by_restaurant': ['preparing'],
      'preparing': ['ready_for_pickup']
    };
    
    return allowedTransitions[currentStatus as keyof typeof allowedTransitions]?.includes(newStatus) || false;
  }
  
  // Courier users can only update certain statuses
  if (userType === 'courier') {
    // Courier can only update from 'ready_for_pickup' to 'picked_up'
    // or from 'picked_up' to 'on_the_way'
    // or from 'on_the_way' to 'delivered'
    const allowedTransitions = {
      'ready_for_pickup': ['picked_up'],
      'picked_up': ['on_the_way'],
      'on_the_way': ['delivered']
    };
    
    return allowedTransitions[currentStatus as keyof typeof allowedTransitions]?.includes(newStatus) || false;
  }
  
  // Admin or employee users can update any status
  if (userType === 'employee') {
    return true;
  }
  
  // Default: no permission
  return false;
};

const OrderStatusUpdate: React.FC<OrderStatusUpdateProps> = ({
  orderId,
  currentStatus,
  onStatusUpdate,
  showOnlyNextStatus = true,
  restaurantId
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [localStatus, setLocalStatus] = useState<OrderStatus>(currentStatus);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Subscribe to MQTT updates for this order
  const { orderStatus } = useOrderMQTT(orderId);
  
  // Update local status when MQTT update comes in
  useEffect(() => {
    if (orderStatus && orderStatus !== localStatus) {
      setLocalStatus(orderStatus as OrderStatus);
    }
  }, [orderStatus, localStatus]);
  
  // Update local status from props when it changes
  useEffect(() => {
    if (currentStatus !== localStatus) {
      setLocalStatus(currentStatus);
    }
  }, [currentStatus, localStatus]);

  // Get the effective status considering auto-cancel rules
  const effectiveStatus = getEffectiveOrderStatus({ 
    id: orderId, 
    status: localStatus, 
    created_at: new Date().toISOString() 
  } as any);

  // If the order is auto-canceled, don't show any update options
  if (effectiveStatus === 'canceled') {
    return (
      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
        <div className="flex items-center text-red-800">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <span className="text-sm">Order automatically canceled due to timeout</span>
        </div>
      </div>
    );
  }

  // If the order is already at or beyond "completed" status, don't show any update options
  if (
    localStatus === 'ready_for_pickup' && user?.user_type !== 'courier' && user?.user_type !== 'employee' ||
    localStatus === 'picked_up' ||
    localStatus === 'on_the_way' ||
    localStatus === 'delivered' ||
    localStatus === 'completed'
  ) {
    return null;
  }

  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    // Check if user has permission to update to this status
    const restaurant = await getRestaurantByOrderId(orderId);
    if (!hasUpdatePermission(user?.user_type, user?.id, restaurant?.user_id, localStatus, newStatus)) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to update this order to this status",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    try {
      const result = await onStatusUpdate(orderId, newStatus);
      if (result.success) {
        // Update local status to immediately reflect the change
        setLocalStatus(newStatus);
        toast({
          title: "Status Updated",
          description: `Order status updated to ${newStatus.replace(/_/g, ' ')}`,
        });

        // Publish notification via MQTT
        orderMQTTService.publishOrderEvent(`foodapp/orders/${orderId}/status`, {
          orderId,
          status: newStatus,
          timestamp: new Date().toISOString()
        });

        // If this is a restaurant accepting an order, also publish to restaurant topic
        if (newStatus === 'accepted_by_restaurant' && restaurantId) {
          orderMQTTService.publishOrderEvent(`foodapp/restaurants/${restaurantId}/status_updates`, {
            orderId,
            status: newStatus,
            timestamp: new Date().toISOString()
          });
        }

        // If this is an order ready for pickup, notify couriers
        if (newStatus === 'ready_for_pickup') {
          orderMQTTService.publishOrderEvent('foodapp/couriers/available_orders', {
            orderId,
            restaurantId,
            status: newStatus,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Helper function to get the restaurant user ID for a particular order
  // This would normally fetch from the database, but we'll mock this for now
  const getRestaurantByOrderId = async (orderId: string) => {
    if (restaurantId) {
      // If we have the restaurant ID, we can use it directly
      return { user_id: user?.id }; // Just assume it matches the current user for simplicity
    }
    return null;
  };

  // For simplified view, just show the next possible status
  if (showOnlyNextStatus) {
    const nextStatus = getNextStatus(localStatus, user?.user_type || '');
    if (!nextStatus) return null;

    return (
      <Button 
        onClick={() => handleUpdateStatus(nextStatus)}
        disabled={isUpdating}
        className="w-full mt-2"
      >
        {isUpdating ? 'Updating...' : `Mark as ${nextStatus.replace(/_/g, ' ')}`}
      </Button>
    );
  }

  // For complete view, show all possible next statuses
  // Filter the status flow based on user type
  const statusFlow = user?.user_type === 'restaurant' ? restaurantStatusFlow :
                     user?.user_type === 'courier' ? courierStatusFlow :
                     [...restaurantStatusFlow, ...courierStatusFlow];
                     
  return (
    <div className="mt-4 space-y-2">
      <p className="text-sm font-medium">Update Order Status:</p>
      <div className="flex flex-wrap gap-2">
        {statusFlow.slice(
          statusFlow.indexOf(localStatus) + 1
        ).map(status => (
          <Button
            key={status}
            variant="outline"
            size="sm"
            onClick={() => handleUpdateStatus(status)}
            disabled={isUpdating}
          >
            {status.replace(/_/g, ' ')}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default OrderStatusUpdate;
