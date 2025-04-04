
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { OrderStatus } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle } from 'lucide-react';

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
  return status !== 'completed' && status !== 'delivered';
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
          // Remove the invalid 'icon' property that was causing the error
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
