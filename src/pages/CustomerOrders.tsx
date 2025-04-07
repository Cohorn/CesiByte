import React, { useState, useEffect } from 'react';
import { useOrders } from '@/hooks/useOrders';
import { useAuth } from '@/lib/AuthContext';
import NavBar from '@/components/NavBar';
import { OrderWithRestaurant } from '@/types/order';
import { OrderStatus, Restaurant, OrderItem } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

interface CustomerOrdersProps {
  // You can define any props this component might receive here
}

const CustomerOrders: React.FC<CustomerOrdersProps> = () => {
  const { user } = useAuth();
  const { orders, loading, error, refetch } = useOrders(user?.id || '');
  const [processedOrders, setProcessedOrders] = useState<OrderWithRestaurant[]>([]);

  useEffect(() => {
    if (orders) {
      const ordersWithRestaurants = processOrdersWithRestaurants(orders);
      setProcessedOrders(ordersWithRestaurants);
    }
  }, [orders]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading orders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Error: {error.message}</p>
      </div>
    );
  }

  const processOrdersWithRestaurants = (data: any[]): OrderWithRestaurant[] => {
    return data.map(order => {
      // Add delivery_pin with default value if it doesn't exist
      const delivery_pin = order.delivery_pin || '0000';
      
      return {
        id: order.id,
        user_id: order.user_id,
        restaurant_id: order.restaurant_id,
        courier_id: order.courier_id,
        status: order.status as OrderStatus,
        items: order.items as OrderItem[],
        total_price: order.total_price,
        delivery_address: order.delivery_address,
        delivery_lat: order.delivery_lat,
        delivery_lng: order.delivery_lng,
        created_at: order.created_at,
        updated_at: order.updated_at,
        delivery_pin: delivery_pin,
        restaurant: {
          id: order.restaurants?.id || '',
          name: order.restaurants?.name || 'Unknown Restaurant',
          address: order.restaurants?.address || 'Unknown Address',
          lat: order.restaurants?.lat || 0,
          lng: order.restaurants?.lng || 0,
          user_id: order.restaurants?.user_id || '',
          created_at: order.restaurants?.created_at || order.created_at,
          image_url: order.restaurants?.image_url || null
        } as Restaurant
      };
    });
  };

  const groupOrdersByStatus = (orders: OrderWithRestaurant[]) => {
    return orders.reduce((acc: { [key in OrderStatus]?: OrderWithRestaurant[] }, order) => {
      if (!acc[order.status]) {
        acc[order.status] = [];
      }
      acc[order.status]?.push(order);
      return acc;
    }, {});
  };

  const groupedOrders = groupOrdersByStatus(processedOrders);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Your Orders</h1>
        {Object.entries(groupedOrders).map(([status, orders]) => (
          <div key={status} className="mb-6">
            <h2 className="text-xl font-semibold mb-2">{status.replace(/_/g, ' ')}</h2>
            {orders?.length === 0 ? (
              <p>No orders with this status.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {orders?.map(order => (
                  <div key={order.id} className="bg-white rounded-md shadow-sm p-4">
                    <h3 className="font-semibold">{order.restaurant.name}</h3>
                    <p className="text-gray-500">{order.delivery_address}</p>
                    <p className="text-sm">Total: ${order.total_price}</p>
                    <p className="text-sm">Delivery Pin: {order.delivery_pin}</p>
                    <ul className="mt-2">
                      {order.items.map(item => (
                        <li key={item.menu_item_id} className="text-sm">
                          {item.name} x{item.quantity} - ${item.price * item.quantity}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomerOrders;
