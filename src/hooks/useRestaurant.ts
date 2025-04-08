
import { useState, useEffect, useCallback } from 'react';
import { restaurantApi } from '@/api/services/restaurantService';
import { Restaurant, MenuItem } from '@/lib/database.types';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface CartItem {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
}

// Make sure the hook returns the menuItems property
export const useRestaurant = (id?: string | null) => {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();
  
  const fetchRestaurant = useCallback(async (id?: string, showErrors: boolean = true) => {
    if (!id) {
      console.log('No restaurant ID provided');
      setLoading(false);
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const restaurantData = await restaurantApi.getRestaurant(id);
      setRestaurant(restaurantData);
      
      const menuData = await restaurantApi.getMenuItems(id);
      setMenuItems(menuData);
      
      setLoading(false);
      return restaurantData;
    } catch (err: any) {
      console.error("Error fetching restaurant:", err);
      setError(err instanceof Error ? err : new Error(err.message || 'Failed to fetch restaurant'));
      
      if (showErrors) {
        toast({
          title: "Error",
          description: "Failed to fetch restaurant data",
          variant: "destructive"
        });
      }
      
      setLoading(false);
      return null;
    }
  }, [toast]);
  
  useEffect(() => {
    if (id) {
      fetchRestaurant(id);
    }
  }, [id, fetchRestaurant]);
  
  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const existingItemIndex = prev.findIndex(i => i.menu_item_id === item.menu_item_id);
      
      if (existingItemIndex > -1) {
        const newCart = [...prev];
        newCart[existingItemIndex].quantity += item.quantity;
        return newCart;
      } else {
        return [...prev, item];
      }
    });
  };
  
  const removeFromCart = (menu_item_id: string) => {
    setCart(prev => prev.filter(item => item.menu_item_id !== menu_item_id));
  };
  
  const updateCartItemQuantity = (menu_item_id: string, quantity: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.menu_item_id === menu_item_id) {
          return { ...item, quantity };
        }
        return item;
      });
    });
  };
  
  const clearCart = () => {
    setCart([]);
  };
  
  const checkout = useCallback(async () => {
    if (!restaurant || !user) {
      throw new Error("Restaurant or user not loaded");
    }
    
    if (cart.length === 0) {
      throw new Error("Cart is empty");
    }
    
    try {
      // Prepare order items for the API
      const orderItems = cart.map(item => ({
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        name: item.name,
        price: item.price
      }));
      
      // Calculate total price
      const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      // Create the order object
      const orderData = {
        restaurant_id: restaurant.id,
        user_id: user.id,
        items: orderItems,
        total_price: totalPrice,
        delivery_address: user.address,
        delivery_lat: user.lat,
        delivery_lng: user.lng,
        restaurant_name: restaurant.name,
        restaurant_address: restaurant.address,
        restaurant_lat: restaurant.lat,
        restaurant_lng: restaurant.lng,
      };
      
      // Call the API to create the order
      const newOrder = await restaurantApi.createOrder(orderData);
      
      // Clear the cart on successful order
      clearCart();
      
      return newOrder;
    } catch (err: any) {
      console.error("Checkout failed:", err);
      throw err;
    }
  }, [restaurant, user, cart, clearCart]);
  
  // Make sure to return menuItems in the return object
  return {
    restaurant,
    menuItems: menuItems || [], // This should be properly implemented but adding a placeholder for type checking
    loading,
    error,
    fetchRestaurant,
    
    // Add missing properties for restaurant menu page
    cart,
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    clearCart,
    checkout,
    isLoading: loading,
  };
};
