
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { OrderStatus } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle } from 'lucide-react';
import { useOrderMQTT } from '@/hooks/useMQTT';
import { useAuth } from '@/lib/AuthContext';

interface OrderStatusUpdateProps {
  orderId: string;
  currentStatus: OrderStatus;
  onStatusUpdate: (orderId: string, status: OrderStatus) => Promise<{ success: boolean }>;
  showOnlyNextStatus?: boolean;
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
  const statusFlow = userType === 'restaurant' ? restaurantStatusFlow : courierStatusFlow;
  const currentIndex = statusFlow.indexOf(currentStatus);
  
  if (currentIndex === -1 || currentIndex === statusFlow.length - 1) {
    return null;
  }
  
  return statusFlow[currentIndex + 1];
};

// Check if the status is a "current" order status
export const isCurrentOrder = (status: OrderStatus): boolean => {
  return status !== 'completed' && status !== 'delivered';
};

// Check if user can update this order status
const canUserUpdateStatus = (userType: string, currentStatus: OrderStatus): boolean => {
  if (userType === 'restaurant') {
    return restaurantStatusFlow.includes(currentStatus);
  } else if (userType === 'courier') {
    return courierStatusFlow.includes(currentStatus);
  }
  return false;
};

const OrderStatusUpdate: React.FC<OrderStatusUpdateProps> = ({
  orderId,
  currentStatus,
  onStatusUpdate,
  showOnlyNextStatus = true
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

  // Check if user can update this order's status
  if (!user || !canUserUpdateStatus(user.user_type, localStatus)) {
    return null;
  }

  // If the order is already at the final status for this user type, don't show any update options
  const nextStatus = getNextStatus(localStatus, user.user_type);
  if (!nextStatus) {
    return null;
  }

  const handleUpdateStatus = async (newStatus: OrderStatus) => {
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

  // For simplified view, just show the next possible status
  if (showOnlyNextStatus) {
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

  // For complete view, show all possible next statuses based on user type
  const statusFlow = user.user_type === 'restaurant' ? restaurantStatusFlow : courierStatusFlow;
  const startIndex = statusFlow.indexOf(localStatus);
  const availableStatuses = statusFlow.slice(startIndex + 1);
  
  return (
    <div className="mt-4 space-y-2">
      <p className="text-sm font-medium">Update Order Status:</p>
      <div className="flex flex-wrap gap-2">
        {availableStatuses.map(status => (
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
