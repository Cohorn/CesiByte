
import { useState, useEffect, useCallback } from 'react';
import { orderApi } from '@/api/services/orderService';
import { Order, OrderStatus, OrderItem } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';

type OrderFilters = {
  userId?: string;
  restaurantId?: string;
  courierId?: string;
  status?: OrderStatus | OrderStatus[];
};

// Prevent excessive refreshes
const MIN_REFRESH_INTERVAL = 30000; // 30 seconds minimum between manual refreshes

export function useOrders(filters: OrderFilters = {}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const [lastRefreshAttempt, setLastRefreshAttempt] = useState<number | null>(null);
  const { toast } = useToast();

  const fetchOrders = useCallback(async (force = false) => {
    // Check if this is a manual refresh (force=true) and rate limit it
    if (force && lastRefreshAttempt) {
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshAttempt;
      
      if (timeSinceLastRefresh < MIN_REFRESH_INTERVAL) {
        console.log(`Skipping manual refresh - too soon (${timeSinceLastRefresh}ms since last attempt)`);
        toast({
          title: "Please wait",
          description: `You can refresh again in ${Math.ceil((MIN_REFRESH_INTERVAL - timeSinceLastRefresh) / 1000)} seconds`,
        });
        return orders;
      }
      
      setLastRefreshAttempt(now);
    }

    // Skip fetching if we've already fetched within the last minute and not forcing refresh
    const now = Date.now();
    if (!force && lastFetched && (now - lastFetched) < 60000) {
      console.log('Skipping order fetch - data is fresh');
      return orders;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching orders with filters:', filters);
      let data: Order[] = [];
      
      // Important: Only try to fetch if we have valid filter parameters
      if (!filters || (Object.keys(filters).length === 0)) {
        console.log('No filters provided, skipping fetch');
        setIsLoading(false);
        return [];
      }
      
      if (filters.userId) {
        console.log('Fetching orders for user:', filters.userId);
        data = await orderApi.getOrdersByUser(filters.userId);
      } else if (filters.restaurantId) {
        console.log('Fetching orders for restaurant:', filters.restaurantId);
        data = await orderApi.getOrdersByRestaurant(filters.restaurantId, force);
      } else if (filters.courierId) {
        data = await orderApi.getOrdersByCourier(filters.courierId);
      } else if (filters.status) {
        data = await orderApi.getOrdersByStatus(filters.status);
      }
      
      // Ensure items are properly parsed
      const processedData = (data || []).map(order => {
        let parsedItems: OrderItem[] = [];
        
        // Handle items parsing based on what the API returns
        if (typeof order.items === 'string') {
          try {
            parsedItems = JSON.parse(order.items);
          } catch (e) {
            console.error('Error parsing order items:', e);
            parsedItems = [];
          }
        } else if (Array.isArray(order.items)) {
          parsedItems = order.items;
        }
        
        return {
          ...order,
          items: parsedItems
        };
      });
      
      console.log(`Fetched ${processedData.length} orders:`, processedData);
      setOrders(processedData || []);
      setFilteredOrders(processedData || []);
      setLastFetched(now);
      setIsLoading(false);
      return processedData;
    } catch (err: any) {
      // Don't show error toast for rate limiting, which is normal
      if (err.isRateLimited) {
        console.log('Order fetch was rate limited');
        setIsLoading(false);
        return orders;
      }
      
      console.error("Error fetching orders:", err);
      setError(err as Error);
      toast({
        title: "Error",
        description: "Failed to load orders. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
      return [];
    }
  }, [filters, toast, orders, lastFetched, lastRefreshAttempt]);

  // Initial fetch on mount or when filters change
  useEffect(() => {
    console.log("useOrders hook mounted or filters changed, fetching orders");
    fetchOrders(false);  // Don't force fetch on mount or filter change
  }, [fetchOrders]);

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    setError(null);
    
    try {
      await orderApi.updateOrderStatus(orderId, status);
      
      toast({
        title: "Success",
        description: `Order status updated to ${status}`,
      });
      
      // Refresh orders after status update - but don't force refresh
      fetchOrders(false);
      
      return { success: true };
    } catch (err) {
      setError(err as Error);
      console.error("Error updating order status:", err);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
      return { success: false, error: err };
    }
  };

  const assignCourier = async (orderId: string, courierId: string) => {
    setError(null);
    
    try {
      await orderApi.assignCourier(orderId, courierId);
      
      toast({
        title: "Success",
        description: "Order assigned successfully",
      });
      
      // Refresh orders after courier assignment - but don't force refresh
      fetchOrders(false);
      
      return { success: true };
    } catch (err) {
      setError(err as Error);
      console.error("Error assigning courier:", err);
      toast({
        title: "Error",
        description: "Failed to assign courier",
        variant: "destructive",
      });
      return { success: false, error: err };
    }
  };

  // Filter orders by a secondary filter (e.g., for search functionality)
  const filterOrders = useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) {
      setFilteredOrders(orders);
      return;
    }
    
    const term = searchTerm.toLowerCase();
    const filtered = orders.filter(order => 
      order.id.toLowerCase().includes(term) ||
      order.delivery_address.toLowerCase().includes(term)
    );
    
    setFilteredOrders(filtered);
  }, [orders]);

  // Clear cache function 
  const clearCache = useCallback(() => {
    orderApi.clearCache();
    setLastFetched(null);
  }, []);

  return {
    orders: filteredOrders,
    isLoading,
    error,
    refetch: fetchOrders,
    updateOrderStatus,
    assignCourier,
    filterOrders,
    clearCache,
  };
}
