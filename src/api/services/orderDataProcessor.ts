
// Data processing for orders
import { Order } from '@/lib/database.types';

// Process order items to ensure they're in the correct format
export const processOrderItems = (order: any): Order => {
  if (!order) return order;
  
  try {
    let parsedItems = [];
    
    if (typeof order.items === 'string') {
      parsedItems = JSON.parse(order.items);
    } else if (Array.isArray(order.items)) {
      parsedItems = order.items;
    } else if (order.items && typeof order.items === 'object') {
      // If it's already a JSON object but not an array
      parsedItems = [order.items];
    }
    
    return {
      ...order,
      items: parsedItems
    };
  } catch (e) {
    console.error(`Error processing items for order ${order?.id}:`, e);
    return order;
  }
};

// Process a batch of orders
export const processOrders = (orders: any[]): Order[] => {
  if (!orders) return [];
  return orders.map(processOrderItems);
};
