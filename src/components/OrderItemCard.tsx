
import React from 'react';
import { OrderItem } from '@/lib/database.types';
import { Card, CardContent } from '@/components/ui/card';

interface OrderItemCardProps {
  item: OrderItem;
}

const OrderItemCard: React.FC<OrderItemCardProps> = ({ item }) => {
  return (
    <Card className="mb-2">
      <CardContent className="p-4">
        <div className="flex justify-between">
          <div>
            <span className="font-medium">{item.name}</span>
            <span className="text-sm text-gray-600 ml-2">x{item.quantity}</span>
          </div>
          <div className="font-medium">${(item.price * item.quantity).toFixed(2)}</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderItemCard;
