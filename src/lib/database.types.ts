export type UserType = 'customer' | 'restaurant' | 'courier' | 'employee';

export type MapLocationType = 'restaurant' | 'courier' | 'user';

export type User = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  user_type: UserType;
  address: string;
  lat: number;
  lng: number;
  employee_role?: string;
  referral_code?: string;
  referred_by?: string;
};

export type SimpleUser = {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
};

export type Restaurant = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  user_id: string;
  created_at: string;
  image_url?: string | null;
};

export type MenuItem = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string;
  price: number;
  available: boolean;
  created_at: string;
  image_url?: string | null;
};

export type OrderStatus = 
  | 'created' 
  | 'accepted_by_restaurant' 
  | 'preparing' 
  | 'ready_for_pickup' 
  | 'picked_up' 
  | 'on_the_way' 
  | 'delivered' 
  | 'completed';

export type Order = {
  id: string;
  user_id: string;
  restaurant_id: string;
  courier_id: string | null;
  status: OrderStatus;
  items: OrderItem[];
  total_price: number;
  delivery_address: string;
  delivery_lat: number;
  delivery_lng: number;
  created_at: string;
  updated_at: string;
  delivery_pin: string;
};

export type OrderItem = {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
};

export type Review = {
  id: string;
  user_id: string;
  restaurant_id?: string;
  courier_id?: string;
  rating: number;
  comment?: string;
  created_at: string;
};

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at'>>;
      };
      restaurants: {
        Row: Restaurant;
        Insert: Omit<Restaurant, 'id' | 'created_at'>;
        Update: Partial<Omit<Restaurant, 'id' | 'created_at'>>;
      };
      menu_items: {
        Row: MenuItem;
        Insert: Omit<MenuItem, 'id' | 'created_at'>;
        Update: Partial<Omit<MenuItem, 'id' | 'created_at'>>;
      };
      orders: {
        Row: Order;
        Insert: Omit<Order, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Order, 'id' | 'created_at' | 'updated_at'>>;
      };
      reviews: {
        Row: Review;
        Insert: Omit<Review, 'id' | 'created_at'>;
        Update: Partial<Omit<Review, 'id' | 'created_at'>>;
      };
    };
  };
}
