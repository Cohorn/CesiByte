
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { OrderStatus } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle } from 'lucide-react';
import { useOrderMQTT } from '@/hooks/useMQTT';
import { getEffectiveOrderStatus } from '@/utils/orderTimeUtils';

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

// Get the next logical status in the workflow
const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
  const currentIndex = restaurantStatusFlow.indexOf(currentStatus);
  if (currentIndex === -1 || currentIndex === restaurantStatusFlow.length - 1) {
    return null;
  }
  return restaurantStatusFlow[currentIndex + 1];
};

// Check if the status is a "current" order status
export const isCurrentOrder = (status: OrderStatus): boolean => {
  return status !== 'completed' && status !== 'delivered' && status !== 'canceled';
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

  // If the order is already at "ready_for_pickup" or beyond, don't show any update options
  if (
    localStatus === 'ready_for_pickup' ||
    localStatus === 'picked_up' ||
    localStatus === 'on_the_way' ||
    localStatus === 'delivered' ||
    localStatus === 'completed'
  ) {
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
    const nextStatus = getNextStatus(localStatus);
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
  return (
    <div className="mt-4 space-y-2">
      <p className="text-sm font-medium">Update Order Status:</p>
      <div className="flex flex-wrap gap-2">
        {restaurantStatusFlow.slice(
          restaurantStatusFlow.indexOf(localStatus) + 1
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
