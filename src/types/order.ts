
import { Order, Restaurant, OrderStatus, OrderItem } from '@/lib/database.types';

export interface OrderWithRestaurant extends Omit<Order, 'items'> {
  items: OrderItem[];
  restaurant: Restaurant;
  estimated_delivery_time?: string;
}

export interface OrderGroup {
  status: OrderStatus;
  orders: OrderWithRestaurant[];
}
