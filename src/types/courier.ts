
import { OrderStatus } from '@/lib/database.types';

export interface RestaurantData {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export interface ActiveOrder {
  id: string;
  restaurant_id: string;
  user_id: string;
  courier_id: string | null;
  status: OrderStatus;
  items: any[];
  total_price: number;
  delivery_address: string;
  delivery_lat: number;
  delivery_lng: number;
  created_at: string;
  updated_at?: string;
  restaurant_name: string;
  restaurant_address: string;
  restaurant_lat: number;
  restaurant_lng: number;
  delivery_pin: string;
}
