
import { Order, OrderStatus } from '@/lib/database.types';

export interface ActiveOrder extends Order {
  restaurant_name: string;
  restaurant_address: string;
  restaurant_lat: number;
  restaurant_lng: number;
}

export interface RestaurantData {
  name: string;
  address: string;
  lat: number;
  lng: number;
}
