
import React, { useMemo } from 'react';
import Map from '@/components/Map';
import { MapLocationType } from '@/lib/database.types';

interface CourierMapLocationsProps {
  activeOrders: any[];
  restaurants: any[];
  userLocation: { lat: number; lng: number } | null;
}

const CourierMapLocations: React.FC<CourierMapLocationsProps> = ({
  activeOrders,
  restaurants,
  userLocation
}) => {
  const mapLocations = useMemo(() => {
    console.log('Generating map locations');
    const locations = [];
    
    // Only process if we have orders
    if (activeOrders && activeOrders.length > 0) {
      console.log('Processing active orders:', activeOrders.length);
      
      activeOrders.forEach(order => {
        // Add restaurant location if available
        if (order.restaurant_id) {
          // Use restaurant data from either the restaurants array or the order itself
          const restaurantFromArray = restaurants?.find(r => r.id === order.restaurant_id);
          
          // Prefer data from restaurants array if available
          const restaurantLat = restaurantFromArray?.lat || order.restaurant_lat;
          const restaurantLng = restaurantFromArray?.lng || order.restaurant_lng;
          const restaurantName = restaurantFromArray?.name || order.restaurant_name || 'Restaurant';
          
          // Only add if coordinates are valid
          if (restaurantLat && restaurantLng && !isNaN(restaurantLat) && !isNaN(restaurantLng)) {
            console.log('Adding restaurant location:', restaurantName);
            locations.push({ 
              id: `restaurant-${order.restaurant_id}`,
              lat: restaurantLat,
              lng: restaurantLng,
              type: 'restaurant' as MapLocationType,
              name: restaurantName
            });
          }
        }
        
        // Add delivery location if coordinates are valid
        if (order.delivery_lat && order.delivery_lng && 
            !isNaN(order.delivery_lat) && !isNaN(order.delivery_lng)) {
          console.log('Adding delivery location');
          locations.push({
            id: `delivery-${order.id}`,
            lat: order.delivery_lat,
            lng: order.delivery_lng,
            type: 'user' as MapLocationType,
            name: 'Delivery Location'
          });
        }
      });
    }
    
    // Add courier location if valid
    if (userLocation && userLocation.lat && userLocation.lng && 
        !isNaN(userLocation.lat) && !isNaN(userLocation.lng)) {
      console.log('Adding courier location');
      locations.push({
        id: 'courier',
        lat: userLocation.lat,
        lng: userLocation.lng,
        type: 'courier' as MapLocationType,
        name: 'Your Location'
      });
    }
    
    console.log('Total map locations:', locations.length);
    return locations;
  }, [activeOrders, restaurants, userLocation]);

  return (
    <div className="bg-gray-100 rounded overflow-hidden" style={{ height: '400px' }}>
      <Map locations={mapLocations} />
    </div>
  );
};

export default CourierMapLocations;
