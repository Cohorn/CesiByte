
import { Order, Restaurant, OrderStatus, OrderItem } from '@/lib/database.types';

export interface OrderWithRestaurant extends Omit<Order, 'items'> {
  items: OrderItem[];
  restaurant: Restaurant;
}

export interface OrderGroup {
  status: OrderStatus;
  orders: OrderWithRestaurant[];
}
