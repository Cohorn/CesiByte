
import React, { useMemo } from 'react';
import Map from '@/components/Map';
import { MapLocationType } from '@/lib/database.types';
import { ActiveOrder } from '@/types/courier';

interface CourierMapLocationsProps {
  activeOrders: any[];
  restaurants: any[];
  userLocation: { lat: number; lng: number };
}

const CourierMapLocations: React.FC<CourierMapLocationsProps> = ({
  activeOrders,
  restaurants,
  userLocation
}) => {
  const mapLocations = useMemo(() => {
    return activeOrders.flatMap(order => {
      const locations = [];
      
      // Add restaurant location if available
      const restaurant = restaurants.find(r => r.id === order.restaurant_id);
      if (restaurant) {
        locations.push({ 
          id: `restaurant-${restaurant.id}`,
          lat: restaurant.lat,
          lng: restaurant.lng,
          type: 'restaurant' as MapLocationType,
          name: restaurant.name
        });
      }
      
      // Add delivery location
      locations.push({
        id: `delivery-${order.id}`,
        lat: order.delivery_lat,
        lng: order.delivery_lng,
        type: 'user' as MapLocationType,
        name: 'Delivery Location'
      });
      
      // Add courier location
      if (userLocation) {
        locations.push({
          id: 'courier',
          lat: userLocation.lat,
          lng: userLocation.lng,
          type: 'courier' as MapLocationType,
          name: 'Your Location'
        });
      }
      
      return locations;
    });
  }, [activeOrders, restaurants, userLocation]);

  return (
    <div className="bg-gray-100 rounded overflow-hidden" style={{ height: '400px' }}>
      <Map locations={mapLocations} />
    </div>
  );
};

export default CourierMapLocations;
